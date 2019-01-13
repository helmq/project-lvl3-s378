export default class {
  url = '';

  isUrlValid = true;

  errorMessage = '';

  urls = new Set();

  channels = [];

  articles = [];

  isRequestSubmitting = false;

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

  submittingRequest() {
    this.isRequestSubmitting = true;
  }

  submittingRequestDone() {
    this.isRequestSubmitting = false;
  }
}
