import { watch } from 'melanke-watchjs';
import { isURL } from 'validator';
import axios from 'axios';
import { find, uniqueId } from 'lodash';
import $ from 'jquery';

const proxy = 'http://cors-anywhere.herokuapp.com/';

export default () => {
  const state = {
    url: '',
    isUrlValid: true,
    errorMessage: '',
    urlList: new Set(),
    channels: [],
    articles: [],
    submittingRequest: false,
  };

  const parseRSS = (rss) => {
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

  const setUrl = (url) => {
    const isUrlValid = isURL(url);
    if (isUrlValid || url === '') {
      state.errorMessage = '';
    }
    state.isUrlValid = isUrlValid;
    state.url = url;
  };
  const addArticles = (items) => { state.articles = [...state.articles, ...items]; };
  const addChannel = (data) => { state.channels = [...state.channels, data]; };
  const addUrl = (url) => { state.urlList.add(url); };
  const removeUrl = (url) => { state.urlList.delete(url); };
  const submitFail = (url, errorMessage) => {
    state.errorMessage = errorMessage;
    removeUrl(url);
    state.submittingRequest = false;
  };

  const requestUrl = () => {
    const { url, isUrlValid, urlList } = state;
    if (!isUrlValid) {
      state.errorMessage = 'Please enter correct URL';
      return;
    }
    if (state.submittingRequest) {
      state.errorMessage = 'Please wait';
      return;
    }
    if (urlList.has(url)) {
      state.errorMessage = 'URL is already exists';
      return;
    }
    state.submittingRequest = true;
    addUrl(url);
    axios.get(`${proxy}${url}`).then(({ data }) => {
      const parser = new DOMParser();
      const parsedData = parser.parseFromString(data, 'application/xml');
      const rss = parsedData.querySelector('rss');
      if (!rss) {
        submitFail(url, 'Given URL contains wrong data');
        return;
      }
      const { title, description, articles } = parseRSS(rss);
      addChannel({ title, description });
      addArticles(articles);
      state.submittingRequest = false;
    }).catch((e) => {
      submitFail(url, e.message);
    });
  };

  const form = document.getElementById('rss-form');
  const input = form.elements.url;
  const channelsFeed = document.getElementById('channels-feed');
  const articlesFeed = document.getElementById('articles-feed');
  const modal = document.getElementById('description-modal');

  watch(state, ['isUrlValid', 'errorMessage'], () => {
    if (state.isUrlValid || state.errorMessage === '') {
      input.classList.remove('is-invalid');
    }
    if (!state.isUrlValid) {
      input.classList.add('is-invalid');
    }

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
    }
  });
  watch(state, ['channels', 'articles'], () => {
    const { articles, channels } = state;
    const channelsHTML = channels.map(({ title, description }) => `
      <div>
        <h4>${title}</h4>
        <p>${description}</p>
      </div>`);
    const articlesHTML = articles.map(({ title, id, link }) => `
        <div class="row">
          <div class="col-8">
            <a href="${link}" target="_blank">${title}</a>
          </div>
          <div class="col">
            <button type="button" class="btn btn-primary" data-toggle="modal" data-id="${id}">Show description</button>
          </div>
        </div>
      `);
    channelsFeed.innerHTML = channelsHTML.join('');
    articlesFeed.innerHTML = articlesHTML.join('<hr>');
    $('button[data-toggle=modal]').click((e) => {
      const { id } = e.target.dataset;
      const { description, title } = find(articles, a => a.id === id);
      const modalBody = modal.querySelector('.modal-body');
      const modalTitle = modal.querySelector('.modal-title');
      modalBody.innerHTML = `<p>${description}</p>`;
      modalTitle.innerHTML = title;
      $(modal).modal('show');
    });
  });
  watch(state, 'channels', () => {
    form.reset();
  });

  input.addEventListener('input', (e) => { console.log(state.errorMessage); setUrl(e.target.value); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    requestUrl();
  });
};
