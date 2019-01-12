import { watch } from 'melanke-watchjs';
import { isURL } from 'validator';
import axios from 'axios';
import { find, size } from 'lodash';
import $ from 'jquery';
import parseRSS from './rss';

const proxy = 'http://cors-anywhere.herokuapp.com/';

const state = {
  url: '',
  isUrlValid: true,
  errorMessage: '',
  urlList: new Set(),
  channels: [],
  articles: [],
  submittingRequest: false,
};

const setUrl = (url) => {
  const isUrlValid = isURL(url);
  if (isUrlValid || url === '') {
    state.errorMessage = '';
  }
  state.isUrlValid = isUrlValid;
  state.url = url;
};
const addArticles = (items) => { state.articles.push(...items); };
const addUrl = (url) => { state.urlList.add(url); };
const removeUrl = (url) => { state.urlList.delete(url); };
const addChannel = (data) => { state.channels.push(data); };

const requestChannel = url => new Promise((resolve, reject) => {
  axios.get(`${proxy}${url}`).then(({ data }) => {
    const rss = parseRSS(data);
    if (size(rss) === 0) {
      reject(new Error('Given url contains wrong data'));
      return;
    }
    resolve(rss);
  }).catch((e) => {
    reject(e);
  });
});
const addUpdateArticlesJob = (url) => {
  const update = () => setTimeout(() => {
    requestChannel(url).then((newData) => {
      const newArticles = newData.articles.filter(newArticle => !find(state.articles,
        oldArticle => oldArticle.link === newArticle.link));
      if (newArticles.length > 0) {
        addArticles(newArticles);
      }
      update();
    }).catch((e) => {
      console.log(e.message);
    });
  }, 5000);
  return update;
};

const updateFeed = () => {
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
  requestChannel(url).then((data) => {
    const { title, description, articles } = data;
    addChannel({ title, description });
    addArticles(articles);
    state.submittingRequest = false;
    const update = addUpdateArticlesJob(url);
    update();
  }).catch((e) => {
    state.errorMessage = e.message;
    removeUrl(url);
    state.submittingRequest = false;
  });
};

export default () => {
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

  input.addEventListener('input', (e) => { setUrl(e.target.value); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    updateFeed();
  });
};
