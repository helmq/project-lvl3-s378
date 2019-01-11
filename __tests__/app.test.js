import { promises as fs } from 'fs';
import path from 'path';
import { html } from 'js-beautify';
import timer from 'timer-promise';
import init from '../src/init';

beforeEach(async () => {
  const pathToHtml = path.resolve(__dirname, '__fixtures__/index.html');
  const innerHTML = await fs.readFile(pathToHtml, 'utf8');
  document.body.innerHTML = innerHTML;
});

const getTree = () => html(document.body.innerHTML);

test('test incorrect url', async () => {
  init();
  const form = document.getElementById('rss-form');
  const input = form.elements.url;
  const button = form.elements.submit;
  input.value = 'test';
  input.dispatchEvent(new Event('input'));
  button.click();
  await timer.start('test', 100);
  expect(getTree()).toMatchSnapshot();
});
