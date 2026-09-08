import { ArrowLeft, ArrowRight, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from './components';
import type { TranslationSchema } from '../src/shared/i18n';
import type { ReleaseCopy } from '../src/shared/i18n/release-copy';
import guideCopy from './guide-copy.json';

export type GuideRoute = 'guide' | 'installation' | 'userscript' | 'glossary';
interface GuideProps {
  route: GuideRoute;
  home: string;
  base: TranslationSchema;
  copy: ReleaseCopy;
  guide: typeof guideCopy.en;
  userscriptNote: string;
  storeLinks: { store: string; href: string; image: string; label: string; width: number; height: number }[];
  shortcuts: string[][];
}

function GuideLink({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) {
  const Icon = external ? ExternalLink : ArrowRight;
  return <Button asChild><a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}<Icon size={14} aria-hidden="true" /></a></Button>;
}

export function GuidePage({ route, home, base: b, copy: c, guide: g, userscriptNote, storeLinks, shortcuts }: GuideProps) {
  const titles = { guide: b.popup.about.documentation, installation: g.installation, userscript: 'Tampermonkey', glossary: g.glossary };
  return <main id="main" className="guide-page">
    <header className="guide-header">
      <nav className="breadcrumbs" aria-label={c.website}><a className="back-link" href={home}><ArrowLeft size={16} aria-hidden="true" />{c.website}</a><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{titles[route]}</span></nav>
      <h1>{titles[route]}</h1><p className="intro">{route === 'glossary' ? g.glossaryIntro : g.intro}</p>
      <nav className="guide-nav" aria-label={b.popup.about.documentation}>
        {(Object.entries(titles) as [GuideRoute,string][]).map(([slug,title]) => <Button asChild key={slug}><a href={`${home}${slug}/`} aria-current={route === slug ? 'page' : undefined}>{title}</a></Button>)}
      </nav>
    </header>

    {route === 'installation' && <>
      <section className="section" id="stores"><h2>Chrome Web Store / Microsoft Edge Add-ons</h2>
        <p>{c.stepInstall}</p><div className="store-links">{storeLinks.map(link => <a className="store-badge" key={link.store} href={link.href} data-store={link.store} data-placement="installation"><img src={link.image} alt={link.label} width={link.width} height={link.height} /></a>)}</div>
        <ol><li>{g.confirm}</li><li>{c.stepRead}</li><li>{c.stepControl}</li></ol>
        <GuideLink href="https://chatgpt.com/" external>{b.common.openChatGPT}</GuideLink>
      </section>
      <section className="section" id="zip"><h2>ZIP</h2><ol><li>{g.zip}</li><li>{g.load}</li></ol>
        <GuideLink href="https://github.com/infoxica/chatgpt-audio-controls/releases" external>ZIP · GitHub</GuideLink>
      </section>
      <section className="section" id="source"><h2>Git + Bun</h2><p>{g.source}</p>
        <pre><code>{'git clone https://github.com/infoxica/chatgpt-audio-controls.git\ncd chatgpt-audio-controls\nbun install\nbun run build'}</code></pre>
        <div className="links"><GuideLink href="https://git-scm.com/downloads" external>Git</GuideLink><GuideLink href="https://bun.sh/" external>Bun</GuideLink></div>
      </section>
    </>}

    {route === 'userscript' && <>
      <section className="section"><h2>1. Tampermonkey</h2><p>{g.manager}</p><GuideLink href="https://www.tampermonkey.net/" external>Tampermonkey</GuideLink></section>
      <section className="section"><h2>2. Chrome / Microsoft Edge</h2><p>{g.permission}</p></section>
      <section className="section"><h2>3. ChatGPT Audio Controls</h2><p>{g.script}</p><div className="links">
        <GuideLink href="https://raw.githubusercontent.com/infoxica/chatgpt-audio-controls/master/userscript/chatgpt-audio-controls.user.js" external>{g.installation} · Userscript</GuideLink>
        <GuideLink href="https://chatgpt.com/" external>{b.common.openChatGPT}</GuideLink>
      </div><p className="guide-note">{g.updates}</p><p className="small">{userscriptNote}</p></section>
    </>}

    {route === 'glossary' && <section className="section"><dl className="guide-settings">{[
      [b.content.tooltips.readAloud, c.stepRead],
      [b.options.general.speedTitle, b.options.general.speedDesc],
      [b.options.general.volumeTitle, b.options.general.volumeDesc],
      [b.options.general.seekTitle, b.options.general.seekDesc],
      [b.popup.quickControls.smoothScrubbing, b.popup.quickControls.smoothScrubbingDesc],
      [b.popup.quickControls.inlineSpeech, b.popup.quickControls.inlineSpeechDesc],
      [b.content.tooltips.download, c.sourceFormat],
    ].map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></section>}

    {route === 'guide' && <>
      <section className="section"><h2>{c.quickStart}</h2><p>{c.quickStartBody}</p><div className="links"><GuideLink href={`${home}installation/`}>{g.installation}</GuideLink><GuideLink href="https://chatgpt.com/" external>{b.common.openChatGPT}</GuideLink></div></section>
      <section className="section"><h2>{b.options.headers.preferencesTitle}</h2><p>{b.options.headers.preferencesDesc}</p>
        <dl className="guide-settings">{[
          [b.options.general.speedTitle,b.options.general.speedDesc], [b.options.general.volumeTitle,b.options.general.volumeDesc],
          [b.options.general.seekTitle,b.options.general.seekDesc], [b.options.general.languageTitle,b.options.general.languageDesc],
        ].map(([title,body]) => <div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
      </section>
      <section className="section"><h2>{b.popup.shortcuts.title}</h2><table><thead><tr><th>{b.popup.tabs.controls}</th><th>Windows / Linux</th><th>macOS</th></tr></thead><tbody>{shortcuts.map(([label,windows,mac])=><tr key={label}><td>{label}</td><td><kbd>{windows}</kbd></td><td><kbd>{mac}</kbd></td></tr>)}</tbody></table>
        <h3 className="guide-subheading">{b.popup.shortcuts.gesturesTitle}</h3><p>{b.options.faq.a1}</p><p>{b.options.shortcutsGuide.gesturesDesc}</p>
      </section>
      <section className="section"><h2>{b.content.tooltips.download}</h2><p>{c.sourceFormat}</p><p>{c.downloadError}</p></section>
      <section className="section"><h2>{c.help}</h2><p>{c.nativeHelp}</p><p>{c.playError}</p><GuideLink href={`${home}#help`}>{c.help}</GuideLink></section>
    </>}
  </main>;
}
