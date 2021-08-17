
const axios = require('axios')
const cheerio = require('cheerio');
const { segment } = require('koishi');

let baseUrl = "http://jandan.net";
let top = "/top";
let top4h = "/top-4h";

let storage = {
    updateTime:"",
    dataList:[],
    views:[]
}
// todo update url concat
// todo no date auto get next page
async function getTop(session) {
    if(storage.updateTime ==="" || (new Date() - storage.updateTime) / 1000 / 60 /60 >= 1) {
        let html = await request(baseUrl + top4h);
        analyzeAndSave(html,storage);
    }
    let result = storage.dataList.pop();

    let results = [];
    results.push(segment("text",{content:"赞:"+result.pos+"\t踩:"+result.neg}));
    results.push(segment("text",{content:result.content}))
    for (let i = 0; i < result.imgs.length; i++) {
        const img = result.imgs[i];
        console.log(img)
        results.push(segment("image",{url:`http:${img}`}));
    }
    
    
    session.send(results.join("\n"))
}

function request(url) {
    return axios.get(url)
}
setTimeout(() => {
    console.log("auto update:",new Date())
    analyzeAndSave(html,storage);
}, 1000 * 60 * 60 * 2);


function analyzeAndSave(html,storage) {
    const $ = cheerio.load(html.data);
    let commentList = $("ol.commentlist li");
    for (let i=0;i< commentList.length;i++) {
        let el = commentList[i];
        let url = $(".author a",el).attr("name");
        let imgs = [];
        let imgUrls = $("p a",el);
        for (let i = 0; i < imgUrls.length; i++) {
            const img = imgUrls[i];
            imgs.push(img.attribs.href)
        }
        imgs = imgs.reverse();
        let content = $("p",el).text();
        let pos = $(".jandan-vote span",el)[0].children[0].data;
        let neg = $(".jandan-vote span",el)[1].children[0].data;
        let commentObj = {
            id:url,
            content:content,
            imgs:imgs,
            pos:pos,
            neg:neg,
        }
        if (!storage.views.includes(url)) {
            storage.dataList.push(commentObj);
            storage.views.push(url);
        }
    }
    storage.dataList =  storage.dataList.reverse();
    storage.updateTime = new Date();
}



module.exports = (ctx) => {
    ctx.middleware((session, next) => {
      if (session.content === 'd') {
        getTop(session);
      }
      return next()
    })
  }