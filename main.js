const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const util = require('util');
const { default: PQueue } = require('p-queue')

const filename = 'mangafire_url.csv';
const fileStream = fs.createReadStream(filename);

const queue = new PQueue({ concurrency: 1 });
const { createCanvas, loadImage } = require('canvas');
const { v4 } = require('uuid');


async function reverseImage(imageArray) {
  const e = imageArray[2];
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const image = await loadImage(imageArray[0]);
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
  return canvas
}


const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', async (line) => {
  idx = line.split(".").slice(-1)[0]
  let list_chapter_url = util.format('https://mangafire.to/ajax/read/%s/list?viewby=chapter', idx);
  console.log(list_chapter_url)
  let mangaFolder = util.format('data/%s', idx)
  try {
    if (!fs.existsSync(mangaFolder)) {
      fs.mkdirSync(mangaFolder);
    }
  } catch (err) {
    console.error(err);
  }
  try {
    const parse = require('node-html-parser').parse
    await queue.add(() => {
      try {
        return axios.get(list_chapter_url, {
          header: {
            'Access-Control-Allow-Origin': "*",
            'Cookies': "_ga=GA1.1.678962416.1679625076; __atuvc=30%7C9%2C38%7C10%2C0%7C11%2C4%7C12%2C38%7C13; _ga_G0K8GSF1S6=GS1.1.1680077000.11.1.1680077014.0.0.0"
          }
        }
        )
          .then((response) => {
            let html_parse = parse(response.data.result.html);
            ul_div = html_parse.querySelector("ul").querySelectorAll("a").forEach(async item => {
              let list_chapter_imgs_url = util.format('https://mangafire.to/ajax/read/chapter/%s', item.rawAttributes["data-id"])
              let chapterFolder = util.format('%s/%s', mangaFolder, item.rawAttributes["data-number"])
              try {
                if (!fs.existsSync(chapterFolder)) {
                  fs.mkdirSync(chapterFolder);
                }
              } catch (err) {
                console.error(err);
              }
              console.log(list_chapter_imgs_url)
              const queue2 = new PQueue({ concurrency: 1 });
              await queue2.add(() => {
                try {
                  return axios.get(list_chapter_imgs_url, {
                    header: {
                      'Access-Control-Allow-Origin': "*",
                      'Cookie': "_ga=GA1.1.678962416.1679625076; __atuvc=30%7C9%2C38%7C10%2C0%7C11%2C4%7C12%2C38%7C13; _ga_G0K8GSF1S6=GS1.1.1680077000.11.1.1680077014.0.0.0"
                    },
                    withCredentials: true
                  })
                    .then((response) => {
                      list_images_urls = response.data.result.images
                      list_images_urls.forEach(async url => {
                        let index = list_images_urls.indexOf(url)
                        if (url[2] !== 0) {
                          let canvas = await reverseImage(url)
                          canvas.toBuffer(function (err, buf) {
                            fs.writeFileSync(util.format("%s/%s.jpg", chapterFolder, index), buf);
                          });
                        }
                      })
                    })
                    .catch((error) => {
                      console.error(error);
                    });
                } catch (error) {
                  console.log(error)
                }
              })
            })
          })
          .catch((error) => {
            console.error(error);
          });
      } catch (error) {
        console.log(error)
      }
    });
  } catch (error) {
    console.log(error)
  };
});