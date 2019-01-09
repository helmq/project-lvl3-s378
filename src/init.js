import { watch } from 'melanke-watchjs';
import { isURL } from 'validator';
import axios from 'axios';
import _ from 'lodash';
// import submit from './rss';

const proxy = 'http://cors-anywhere.herokuapp.com/';

export default () => {
  const state = {
    url: '',
    valid: true,
    errorMessage: '',
    urlList: new Set(),
    channels: [],
    articles: [],
  };

  const form = document.getElementById('rss-form');
  const input = form.elements.url;
  const channelsFeed = document.getElementById('channels-feed');
  const articlesFeed = document.getElementById('articles-feed');

  const setUrl = (val) => { state.url = val; };
  const setValidUrl = (isValid) => { state.valid = isValid; };
  const addArticles = (items) => { state.articles = [...state.articles, ...items]; };
  const addChannel = (data) => { state.channels = [...state.channels, data]; };
  const addUrl = (url) => { state.urlList.add(url); };

  const getFieldData = (node, fieldName) => _.find(node, n => n.nodeName === fieldName)
    .firstChild.data;

  const updateFeed = () => {
    const channels = state.channels.map(({ title, description }) => `
      <div>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>`);
    const articles = state.articles.map(({ title, description, link }) => `
        <div>
          <a href="${link}" target="_blank"><h4>${title}</h4></a>
          <p>${description}</p>
        </div>
      `);
    channelsFeed.innerHTML = channels.join('');
    articlesFeed.innerHTML = articles.join('');
  };

  const submit = (url) => {
    if (!state.valid || state.url === '') {
      state.errorMessage = 'Please enter correct URL';
      return false;
    }
    if (state.urlList.has(url)) {
      state.errorMessage = 'URL is already added';
      return false;
    }
    axios.get(proxy + url).then(({ data }) => {
      const parser = new DOMParser();
      const parsedData = parser.parseFromString(data, 'application/xml');
      if (parsedData.firstChild.nodeName !== 'rss') {
        state.errorMessage = 'Given URL contains wrong data';
        return;
      }
      const channel = parsedData.firstChild.firstChild.childNodes;
      const articles = Object.keys(channel)
        .filter(index => channel[index].nodeName === 'item')
        .map((index) => {
          const article = channel[index].childNodes;
          const title = getFieldData(article, 'title');
          const description = getFieldData(article, 'description');
          const link = getFieldData(article, 'link');
          return { title, description, link };
        });
      const title = getFieldData(channel, 'title');
      const description = getFieldData(channel, 'description');
      addChannel({ title, description });
      addArticles(articles);
      addUrl(url);
      form.reset();
      updateFeed();
    }).catch((e) => {
      state.errorMessage = e.message;
    });
    return true;
  };

  watch(state, 'url', () => {
    if (isURL(state.url) || state.url === '') {
      setValidUrl(true);
    } else {
      setValidUrl(false);
    }
  });
  watch(state, 'valid', () => {
    if (state.valid) {
      state.errorMessage = '';
      input.classList.remove('is-invalid');
    } else {
      input.classList.add('is-invalid');
    }
  });
  watch(state, 'errorMessage', () => {
    if (state.errorMessage !== '') {
      const feedbackEl = document.createElement('div');
      feedbackEl.classList.add('invalid-feedback');
      feedbackEl.textContent = state.errorMessage;
      input.classList.add('is-invalid');
      input.parentNode.appendChild(feedbackEl);
    } else {
      input.classList.remove('is-invalid');
      const feedbackEl = input.parentNode.querySelector('.invalid-feedback');
      input.parentNode.removeChild(feedbackEl);
    }
  });

  input.addEventListener('input', (e) => { setUrl(e.target.value); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit(state.url);
  });
};
