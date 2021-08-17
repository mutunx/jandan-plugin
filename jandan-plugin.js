
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
// todo fix all user use one datastorge 
 function getTop(session) {
    if(storage.updateTime ==="" || (new Date() - storage.updateTime) / 1000 / 60 /60 >= 1) {
        analyzeAndSave(baseUrl + top4h,storage);
    } else if (storage.dataList.length == 0) {
        session.send("没了",segment("face",{id:"174"}))
    }
    let result = storage.dataList.pop();

    let results = [];
    let posText = segment("face",{id:"76"});
    let negText = segment("face",{id:"77"});
    let posVal = result.pos;
    let negVal = result.neg;
    results.push(`${posText}:${posVal}\t${negText}:${negVal}`);
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
    analyzeAndSave(baseUrl + top4h,storage);
}, 1000 * 60 * 60 * 2);


async function analyzeAndSave(url,storage) {
    let html = await request(url);
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