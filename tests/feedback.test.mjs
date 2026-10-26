import { expect, test } from 'bun:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { validFeedbackURL, feedbackURL } from '../src/shared/feedback';
test('feedback links are restricted to the production Worker',()=>{
  expect(validFeedbackURL('https://chatgpt-audio-feedback.example.workers.dev/feedback')).toBe(true);
  for(const url of ['http://chatgpt-audio-feedback.example.workers.dev/feedback','https://evil.test/feedback','https://chatgpt-audio-feedback-staging.example.workers.dev/feedback','https://chatgpt-audio-feedback.example.workers.dev/feedback?redirect=https://evil.test','https://user@chatgpt-audio-feedback.example.workers.dev/feedback'])expect(validFeedbackURL(url)).toBe(false);
  const url=new URL(feedbackURL('ja','uninstall','Windows'));expect(url.searchParams.get('source')).toBe('uninstall');expect(url.searchParams.get('lang')).toBe('ja');
});
test('legacy endpoint has no write path and sends old versions to the new form',()=>{
  let template;
  const context=vm.createContext({SURVEY_COPY:{en:{send:'Send feedback',feedbackPrivacy:'Private feedback'}},FEEDBACK_URL:'https://chatgpt-audio-feedback.example.workers.dev/feedback',HtmlService:{createTemplateFromFile:()=>template={evaluate(){return {setTitle(){return this;},addMetaTag(){return this;}};}}}});
  const code=fs.readFileSync('feedback/Code.gs','utf8');vm.runInContext(code,context);
  context.doGet({parameter:{lang:'constructor',version:'1.2.0',os:'Windows'}});
  expect(template.destination).toContain('source=uninstall&lang=en');expect(template.destination).toContain('version=1.2.0');
  expect(()=>context.submitFeedback({})).toThrow('moved');expect(code).not.toContain('SpreadsheetApp');
});
