const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const util = require('util');
const {default: PQueue} = require('p-queue')

const filename = 'mangafire_url.csv';
const fileStream = fs.createReadStream(filename);

const queue = new PQueue({concurrency: 1});
const { createCanvas, loadImage } = require('canvas');
const { v4 } = require('uuid') ;

async function loadImageFromUrl(url) {
  try {
    console.log(url)
    const image = await loadImage(url);
    return image;
  } catch (error) {
    console.error(`Error loading image from URL: ${url}`, error);
    throw error;
  }
}

async function reverseImage(imageArray) {
  const e = imageArray[2];
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const image = await loadImageFromUrl(imageArray[0]);
  image.crossOrigin = 'Anonymous';

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.clearRect(0, 0, image.width, image.height);

  const f = 5,
      s = Math.min(200, Math.ceil(image.width / f)),
      h = Math.min(200, Math.ceil(image.height / f)),
      W = Math.ceil(image.width / s) - 1,
      d = Math.ceil(image.height / h) - 1;
  let x, l;
  for (let y = 0; y <= d; y++) {
      for (let m = 0; m <= W; m++) {
          x = m;
          l = y;
          if (m < W) {
              x = (W - m + e) % W;
          }
          if (y < d) {
              l = (d - y + e) % d;
          }

          ctx.drawImage(
              image,
              x * s,
              l * h,
              Math.min(s, image.width - m * s),
              Math.min(h, image.height - y * h),
              m * s,
              y * h,
              Math.min(s, image.width - m * s),
              Math.min(h, image.height - y * h)
          );
      }
  }
  let name = v4()
  const out =  fs.createWriteStream(util.format('data/%s.png',name));
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => {
    console.log(`Saved ${name}`);
  });
}


async function saveCanvasAsImage(canvas, filename) {
  const out =  fs.createWriteStream(filename);
  const stream = canvas.createPNGStream();
  await stream.pipe(out);
  out.on('finish', () => {
    console.log(`Saved ${filename}`);
  });
}

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
          ul_div = html_parse.querySelector("ul").querySelectorAll("a").forEach(async item => {
            let list_chapter_imgs_url = util.format('https://mangafire.to/ajax/read/chapter/%s', item.rawAttributes["data-id"])
            const queue2 = new PQueue({concurrency: 1}); 
            await queue2.add(() => {
              return axios.get(list_chapter_imgs_url)
              .then((response) => {
                list_images_urls = response.data.result.images
                let count = 0
                list_images_urls.forEach(async url => {
                  if (url[2] !== 0) {
                    await reverseImage(url)
                    // let name = v4()
                    // await saveCanvasAsImage(canvas, util.format('data/%s.png',name))
                    // count += 1
                  }
                })
              })
              .catch((error) => {
                console.error(error);
              });
            })
          })
        })
        .catch((error) => {
          console.error(error);
        });
    });
  }catch(error){
    console.log(error)
  };
});