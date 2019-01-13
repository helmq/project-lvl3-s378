import { watch } from 'melanke-watchjs';
import { isURL } from 'validator';
import axios from 'axios';
import _ from 'lodash';
import $ from 'jquery';
import parseRSS from './rss';

const proxy = 'http://cors-anywhere.herokuapp.com/';

const updateArticles = (state) => {
  const urls = Array.from(state.urls);
  const promises = urls.map(url => axios.get(`${proxy}${url}`));
  Promise.all(promises).then((allData) => {
    const fetchedArticles = _.flatten(allData.map(parseRSS).map(content => content.articles));
    const currentArticles = state.articles;
    const newArticles = _.differenceBy(fetchedArticles, currentArticles, 'link');
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
  if (!state.isUrlValid || state.url === '') {
    state.setErrorMessage('Please enter correct URL');
    return;
  }
  if (state.isRequestSubmitting) {
    state.setErrorMessage('Please wait');
    return;
  }
  if (state.urls.has(state.url)) {
    state.setErrorMessage('URL is already exists');
    return;
  }
  state.setRequestStatusSubmitting();
  axios.get(`${proxy}${state.url}`).then((content) => {
    try {
      const { title, description, articles } = parseRSS(content);
      state.addChannel({ title, description });
      state.addArticles(articles);
      state.setRequestStatusDone();
      state.addUrl(state.url);
      if (!state.checkingUpdates) {
        updateArticles(state);
        state.toggleCheckingUpdates();
      }
    } catch (e) {
      state.setErrorMessage(e.message);
      state.setRequestStatusDone();
    }
  }).catch((e) => {
    state.setErrorMessage(e.message);
    state.setRequestStatusDone();
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
      const { description, title } = _.find(articles, a => a.id === id);
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
    return false; // prevent submit for Safari
  });
};
