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
          return {
            title,
            description,
            link,
            id: Number(uniqueId()),
          };
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
  const modal = document.getElementById('description-modal');

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
    $('button[data-toggle=modal]').each((i, button) => {
      $(button).click(() => {
        const id = $(button).data('id');
        const { description } = find(articles, a => a.id === id);
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `<p>${description}</p>`;
        $(modal).modal('show');
      });
    });
  });
  watch(state.request, 'succeed', () => {
    if (state.request.succeed) {
      form.reset();
    }
  });

  input.addEventListener('input', (e) => { setUrl(e.target.value); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit(state.url);
  });
};
