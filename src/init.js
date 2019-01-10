import { watch } from 'melanke-watchjs';
import { isURL } from 'validator';
import axios from 'axios';
import { find } from 'lodash';

const proxy = 'http://cors-anywhere.herokuapp.com/';

export default () => {
  const state = {
    url: '',
    isUrlValid: true,
    errorMessage: '',
    urlList: new Set(),
    channels: [],
    articles: [],
    request: {
      submitting: false,
      succeed: false,
    },
  };

  const validateUrl = url => isURL(url) || url === '';
  const getFieldData = (node, fieldName) => find(node, n => n.nodeName === fieldName)
    .firstChild.data;

  const setUrl = (url) => {
    const isUrlValid = validateUrl(url);
    if (isUrlValid) {
      state.errorMessage = '';
    }
    state.isUrlValid = isUrlValid;
    state.url = url;
  };
  const addArticles = (items) => { state.articles = [...state.articles, ...items]; };
  const addChannel = (data) => { state.channels = [...state.channels, data]; };
  const addUrl = (url) => { state.urlList.add(url); };
  const removeUrl = (url) => { state.urlList.delete(url); };
  const toggleRequestState = (submitting, succeed = false) => {
    state.request.submitting = submitting;
    state.request.succeed = succeed;
  };
  const submitFail = (url, errorMessage) => {
    state.errorMessage = errorMessage;
    removeUrl(url);
    toggleRequestState(false, false);
  };

  const submit = () => {
    const { url, valid, urlList } = state;
    if (valid || url === '') {
      state.errorMessage = 'Please enter correct URL';
      return false;
    }
    if (urlList.has(url)) {
      state.errorMessage = 'URL is already exists';
      return false;
    }
    toggleRequestState(true);
    addUrl(url);
    axios.get(proxy + url).then(({ data }) => {
      const parser = new DOMParser();
      const parsedData = parser.parseFromString(data, 'application/xml');
      if (parsedData.firstChild.nodeName !== 'rss') {
        submitFail(url, 'Given URL contains wrong data');
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
      toggleRequestState(false, true);
    }).catch((e) => {
      submitFail(url, e.message);
    });
    return true;
  };

  const form = document.getElementById('rss-form');
  const input = form.elements.url;
  const channelsFeed = document.getElementById('channels-feed');
  const articlesFeed = document.getElementById('articles-feed');
  watch(state, 'isUrlValid', () => {
    if (state.isUrlValid) {
      input.classList.remove('is-invalid');
    } else {
      input.classList.add('is-invalid');
    }
  });
  watch(state, 'errorMessage', () => {
    const currentFeedbackEl = input.parentNode.querySelector('.invalid-feedback');
    if (currentFeedbackEl) {
      input.parentNode.removeChild(currentFeedbackEl);
    }
    if (state.errorMessage !== '') {
      const feedbackEl = document.createElement('div');
      feedbackEl.classList.add('invalid-feedback');
      feedbackEl.textContent = state.errorMessage;
      input.classList.add('is-invalid');
      input.parentNode.appendChild(feedbackEl);
    } else {
      input.classList.remove('is-invalid');
    }
  });
  watch(state, ['channels', 'articles'], () => {
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
  });
  watch(state.form, 'succeed', () => {
    if (state.form.succed) {
      form.reset();
    }
  });

  input.addEventListener('input', (e) => { setUrl(e.target.value); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit(state.url);
  });
};
