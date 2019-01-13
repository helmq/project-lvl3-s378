export default class {
  url = '';

  isUrlValid = true;

  errorMessage = '';

  urls = new Set();

  channels = [];

  articles = [];

  isRequestSubmitting = false;

  checkingUpdates = false;

  setUrl(url) {
    this.url = url;
  }

  urlIsValid() {
    this.isUrlValid = true;
  }

  urlIsInvalid() {
    this.isUrlValid = false;
  }

  addArticles(articles) {
    this.articles.push(...articles);
  }

  setErrorMessage(errorMessage) {
    this.errorMessage = errorMessage;
  }

  addUrl(url) {
    this.urls.add(url);
  }

  removeUrl(url) {
    this.urls.delete(url);
  }

  addChannel(data) {
    this.channels.push(data);
  }

  setRequestStatusSubmitting() {
    this.isRequestSubmitting = true;
  }

  setRequestStatusDone() {
    this.isRequestSubmitting = false;
  }

  toggleCheckingUpdates() {
    this.checkingUpdates = !this.checkingUpdates;
  }
}
