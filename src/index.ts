import * as fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as urlParser from 'url';

const seenUrls = {} as any;

const getUrl = (link: string, host: string, protocol: string) => {
  if (link.includes('http')) {
    return link;
  } else if (link.startsWith('/')) {
    return `${protocol}//${host}${link}`;
  } else {
    return `${protocol}//${host}/${link}`;
  }
};

const crawl = async ({ url, ignore }: { url: string; ignore: string }) => {
  if (seenUrls[url]) return;
  console.log('crawling', url);
  seenUrls[url] = true;

  const parsedUrl = urlParser.parse(url);

  if (
    parsedUrl.host &&
    typeof parsedUrl.host === 'string' &&
    parsedUrl.protocol &&
    typeof parsedUrl.protocol === 'string'
  ) {
    const { host, protocol } = parsedUrl as { host: string; protocol: string };
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const links = $('a')
      .map((i, link) => link.attribs.href)
      .get();

    const imageUrls = $('img')
      .map((i, link) => link.attribs.src)
      .get();

    imageUrls.forEach((imageUrl) => {
      fetch(getUrl(imageUrl, host, protocol)).then((response) => {
        const filename = path.basename(imageUrl);
        const dest = fs.createWriteStream(`images/${filename}`);
        response.body.pipe(dest);
      });
    });

    links
      .filter((link) => link.includes(host) && !link.includes(ignore))
      .forEach((link) => {
        crawl({
          url: getUrl(link, host, protocol),
          ignore,
        });
      });
  } else {
    console.error('Invalid URL format');
  }
};

crawl({
  url: 'http://stevescooking.blogspot.com/',
  ignore: '/search',
});
