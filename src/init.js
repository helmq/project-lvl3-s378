import { watch } from 'melanke-watchjs';
import { isURL } from 'validator';
import axios from 'axios';
import { find, size, flatten } from 'lodash';
import $ from 'jquery';
import parseRSS from './rss';

const proxy = 'http://cors-anywhere.herokuapp.com/';

const updateArticles = (state) => {
  const urls = Array.from(state.urls);
  const promises = urls.map(url => axios.get(`${proxy}${url}`));
  Promise.all(promises).then((allData) => {
    const articles = flatten(allData.map(parseRSS).map(content => content.articles));
    const newArticles = articles.filter(newArticle => !find(state.articles,
      oldArticle => oldArticle.link === newArticle.link));
    if (newArticles.length > 0) {
      state.addArticles(newArticles);
    }
  }).catch((e) => {
    console.log(e.message);
  }).finally(() => {
    setTimeout(updateArticles, 5000, state);
  });
};
const updateFeed = (state) => {
  const {
    url, isUrlValid, urls, isRequestSubmitting,
  } = state;
  if (!isUrlValid) {
    state.setErrorMessage('Please enter correct URL');
    return;
  }
  if (isRequestSubmitting) {
    state.setErrorMessage('Please wait');
    return;
  }
  if (urls.has(url)) {
    state.setErrorMessage('URL is already exists');
    return;
  }
  state.submittingRequest();
  state.addUrl(url);
  axios.get(`${proxy}${url}`).then((content) => {
    const parsed = parseRSS(content);
    if (size(content) === 0) {
      state.setErrorMessage('Given url contains wrong data');
      return;
    }
    const { title, description, articles } = parsed;
    state.addChannel({ title, description });
    state.addArticles(articles);
    state.submittingRequestDone();
    updateArticles(state);
  }).catch((e) => {
    state.setErrorMessage(e.message);
    state.removeUrl(url);
    state.submittingRequestDone();
  });
};

const onChangeUrl = (state) => {
  const { url } = state;
  const isUrlValid = isURL(url) || url === '';
  if (isUrlValid) {
    state.setErrorMessage('');
    state.urlIsValid();
  } else {
    state.urlIsInvalid();
  }
  state.setUrl(url);
};

export default (state) => {
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

  input.addEventListener('input', (e) => {
    state.setUrl(e.target.value);
    onChangeUrl(state);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    updateFeed(state);
  });
};
