const parse = require('node-html-parser');
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const util = require('util');
const {default: PQueue} = require('p-queue')

const filename = 'mangafire_url.csv';
const fileStream = fs.createReadStream(filename);

const queue = new PQueue({concurrency: 5});

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', async (line) => {
  idx = line.split(".").slice(-1)[0]
  let list_chapter_url = util.format('https://mangafire.to/ajax/read/%s/list?viewby=chapter', idx);
  // console.log(list_chapter_url)
  try {
    const parse = require('node-html-parser').parse
    await queue.add(() => {
      return axios.get(list_chapter_url)
        .then((response) => {
          let html_parse = parse(response.data.result.html);
          ul_div = html_parse.querySelector("ul").querySelectorAll("a")
          console.log(typeof ul_div)
        })
        .catch((error) => {
          console.error(error);
        });
    });
  }catch(error){
    console.log(error)
  };
});