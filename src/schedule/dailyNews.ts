import * as utils from '../../lib/utils';
import { Element } from 'cheerio';
import * as querystring from 'querystring';
import { default as axios } from 'axios';
import * as iconv from 'iconv-lite';
import * as cheerio from 'cheerio';


const crawler = async () => {
  const params = querystring.stringify({
    mode: 'LS2D',
    mid: 'shm',
    sid1: '105',
    sid2: '230',
  });
  const url = `https://news.naver.com/main/list.naver?${params}`;
  const html = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer',
  });
  let content = iconv.decode(html.data, 'EUC-KR').toString(); //html 파싱한걸 한글깨짐방지
  content = content.replace(/�/gi, '');
  const $ = cheerio.load(content);
  const liList = $('#main_content > div.list_body.newsflash_body > ul.type06_headline li');
  const messageList: any[] = [];
  liList.each(function (index: number, li: Element) {
    index;
    const a = $(li).find('a');
    messageList.push(`- [${a.text().trim()}](${a.attr('href')?.trim()})`);
  });
  const text = messageList.join('\n');

  const bot = utils.bot();
  await bot.sendMessage(process.env.TELEGRAM_CHAT_ID || 'ERROR!', text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
};

exports.handler = async (event: any, context: any) => {
  try {
    await crawler();
  } catch (e) {
    console.error(`Final Catch in ${__filename}:`, e);
    await utils.errorMessageSender(event, context, e);
  } finally {

  }
  return {
    statusCode: 200,
  };
};
