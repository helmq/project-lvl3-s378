import { uniqueId } from 'lodash';

export default (data) => {
  const parser = new DOMParser();
  const parsedData = parser.parseFromString(data, 'application/xml');
  const rss = parsedData.querySelector('rss');
  if (!rss) {
    return {};
  }
  const channelTitle = rss.querySelector('title').textContent;
  const channelDescription = rss.querySelector('description').textContent;
  const items = rss.querySelectorAll('item');
  const articles = Object.keys(items).map(key => items[key])
    .map((article) => {
      const title = article.querySelector('title').textContent;
      const description = article.querySelector('description').textContent;
      const link = article.querySelector('link').textContent;
      return {
        title,
        description,
        link,
        id: uniqueId(),
      };
    });
  return { title: channelTitle, description: channelDescription, articles };
};
