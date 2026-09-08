import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import * as Select from '@radix-ui/react-select';
import * as Accordion from '@radix-ui/react-accordion';
import * as Toggle from '@radix-ui/react-toggle';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { Slot } from '@radix-ui/react-slot';
import { ArrowUpRight, BookOpen, Check, ChevronDown, ChevronUp, CircleHelp, Globe, Languages, LayoutDashboard, List, Menu, Minus, Moon, MousePointerClick, Play, Plus, Settings, ShieldCheck, Star, Sun } from 'lucide-react';
import { consentKey, disableAnalytics, enableAnalytics, trackStoreClick } from './analytics';

export function Button({ asChild = false, variant = 'outline', className = '', ...props }: ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
  variant?: 'outline' | 'primary' | 'link';
}) {
  const Component = asChild ? Slot : 'button';
  return <Component className={`ui-button ui-button-${variant} ${className}`} {...props} />;
}

export interface HeaderControlsProps {
  locale: string;
  languageLabel: string;
  themeLabel: string;
  options: { code: string; name: string; url: string }[];
}

export interface SiteNavigationProps {
  label: string;
  groups: { label: string; links: { label: string; href: string; description?: string }[] }[];
}

export function SiteNavigation({ label, groups }: SiteNavigationProps) {
  const icons = [[Play, List, MousePointerClick, LayoutDashboard], [BookOpen, Settings, Globe, List], [CircleHelp, Star, ShieldCheck, ArrowUpRight]];
  const items = (group: SiteNavigationProps['groups'][number]) => group.links.map(link =>
    <DropdownMenu.Item asChild key={link.href}><a className="navigation-item" href={link.href}>{link.label}</a></DropdownMenu.Item>);
  return <div className="site-navigation">
    <NavigationMenu.Root aria-label={label} className="desktop-navigation" delayDuration={100} skipDelayDuration={300}>
      <NavigationMenu.List className="mega-triggers">{groups.map((group, groupIndex) => <NavigationMenu.Item key={group.label} value={String(groupIndex)}>
        <NavigationMenu.Trigger className="navigation-trigger">{group.label}<ChevronDown size={14} aria-hidden="true" /></NavigationMenu.Trigger>
        <NavigationMenu.Content className="mega-content">
          <p className="mega-heading">{group.label}</p>
          <ul className="mega-links">{group.links.map((link, index) => {
            const Icon = icons[groupIndex]?.[index] || ArrowUpRight;
            return <li key={link.href}><NavigationMenu.Link asChild><a className="mega-link" href={link.href}>
              <span className="mega-icon"><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span>
              <span><span className="mega-link-title">{link.label}</span>{link.description && <span className="mega-description">{link.description}</span>}</span>
            </a></NavigationMenu.Link></li>;
          })}</ul>
        </NavigationMenu.Content>
      </NavigationMenu.Item>)}</NavigationMenu.List>
      <div className="mega-position"><NavigationMenu.Viewport className="mega-viewport" /></div>
    </NavigationMenu.Root>
    <nav aria-label={label} className="mobile-navigation"><DropdownMenu.Root>
      <DropdownMenu.Trigger className="navigation-trigger" aria-label={label}><Menu size={21} aria-hidden="true" /></DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Content className="navigation-menu" align="end" sideOffset={10} collisionPadding={12}>
        {groups.map(group => <DropdownMenu.Group key={group.label}><DropdownMenu.Label className="navigation-label">{group.label}</DropdownMenu.Label>{items(group)}</DropdownMenu.Group>)}
      </DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root></nav>
  </div>;
}

export function HeaderControls({ locale, languageLabel, themeLabel, options }: HeaderControlsProps) {
  const [light, setLight] = useState(false);
  const themeKey = 'cgpt-audio-website-theme';
  useEffect(() => {
    let savedLight = false;
    try { savedLight = localStorage.getItem(themeKey) === 'light'; } catch { /* Storage can be disabled. */ }
    document.documentElement.dataset.theme = savedLight ? 'light' : 'dark';
    setLight(savedLight);
  }, []);
  return <div className="header-settings">
    <NavigationMenu.Root className="desktop-languages" aria-label={languageLabel} delayDuration={100}>
      <NavigationMenu.List className="mega-triggers"><NavigationMenu.Item>
        <NavigationMenu.Trigger id="locale" className="language-picker navigation-trigger" aria-label={`${languageLabel}: ${options.find(item => item.code === locale)?.name || locale}`} title={languageLabel}>
          <Languages size={20} strokeWidth={1.6} aria-hidden="true" /><ChevronDown className="language-chevron" size={14} aria-hidden="true" />
        </NavigationMenu.Trigger>
        <NavigationMenu.Content className="language-mega-content">
          <p className="mega-heading">{languageLabel}</p>
          <ul className="language-grid">{options.map(option => <li key={option.code}>
            <NavigationMenu.Link asChild active={option.code === locale}><a href={option.url} lang={option.code} className="language-grid-link">
              <span>{option.name}</span>{option.code === locale && <Check size={16} aria-hidden="true" />}
            </a></NavigationMenu.Link>
          </li>)}</ul>
        </NavigationMenu.Content>
      </NavigationMenu.Item></NavigationMenu.List>
      <div className="mega-position"><NavigationMenu.Viewport className="mega-viewport language-mega-viewport" /></div>
    </NavigationMenu.Root>
    <div className="mobile-languages">
    <Select.Root value={locale} onValueChange={code => {
      const option = options.find(item => item.code === code);
      if (option) location.assign(option.url);
    }}>
      <Select.Trigger id="locale-mobile" className="language-picker" aria-label={`${languageLabel}: ${options.find(item => item.code === locale)?.name || locale}`} title={languageLabel}>
        <Languages size={20} strokeWidth={1.6} aria-hidden="true" />
        <span className="sr-only"><Select.Value>{options.find(item => item.code === locale)?.name}</Select.Value></span>
        <Select.Icon asChild><ChevronDown className="language-chevron" size={14} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="language-menu" position="popper" align="end" sideOffset={8} collisionPadding={12}>
          <Select.ScrollUpButton className="language-scroll"><ChevronUp size={16} aria-hidden="true" /></Select.ScrollUpButton>
          <Select.Viewport className="language-options">
            {options.map(option => <Select.Item className="language-option" key={option.code} value={option.code} textValue={option.name}>
              <Select.ItemText><span lang={option.code}>{option.name}</span></Select.ItemText>
              <Select.ItemIndicator><Check size={16} aria-hidden="true" /></Select.ItemIndicator>
            </Select.Item>)}
          </Select.Viewport>
          <Select.ScrollDownButton className="language-scroll"><ChevronDown size={16} aria-hidden="true" /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
    </div>
    <Toggle.Root asChild pressed={light} onPressedChange={next => {
      setLight(next);
      document.documentElement.dataset.theme = next ? 'light' : 'dark';
      try { localStorage.setItem(themeKey, next ? 'light' : 'dark'); } catch { /* Current-page appearance still changes. */ }
    }}>
      <Button id="theme-toggle" className="theme-toggle" aria-label={themeLabel} title={themeLabel}>
        <Sun className="sun" size={19} strokeWidth={1.6} aria-hidden="true" />
        <Moon className="moon" size={19} strokeWidth={1.6} aria-hidden="true" />
      </Button>
    </Toggle.Root>
  </div>;
}

export interface FaqAccordionProps { items: [string, string][] }

export function FaqAccordion({ items }: FaqAccordionProps) {
  return <Accordion.Root type="multiple" className="faq-accordion">
    {items.map(([question, answer], index) => <Accordion.Item className="faq-item" key={index} value={String(index)}>
      <Accordion.Header className="faq-heading">
        <Accordion.Trigger className="faq-trigger">
          <span>{question}</span>
          <span className="disclosure-icons">
            <Plus className="disclosure-open" size={20} strokeWidth={1.6} aria-hidden="true" />
            <Minus className="disclosure-close" size={20} strokeWidth={1.6} aria-hidden="true" />
          </span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="faq-content" forceMount><p>{answer}</p></Accordion.Content>
    </Accordion.Item>)}
  </Accordion.Root>;
}

export interface ConsentBannerProps { title: string; body: string; accept: string; decline: string }

export function ConsentBanner({ title, body, accept, decline }: ConsentBannerProps) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const focusOnOpen = useRef(false);
  useEffect(() => {
    let preference = '';
    try { preference = localStorage.getItem(consentKey) || ''; } catch { /* Ask without relying on storage. */ }
    setOpen(preference !== 'accepted' && preference !== 'declined');
    if (preference === 'accepted') enableAnalytics();
    const preferences = document.getElementById('analytics-preferences');
    const show = () => { focusOnOpen.current = true; setOpen(true); };
    preferences?.addEventListener('click', show);
    document.addEventListener('click', trackStoreClick);
    return () => {
      preferences?.removeEventListener('click', show);
      document.removeEventListener('click', trackStoreClick);
    };
  }, []);
  useEffect(() => {
    if (open && focusOnOpen.current) panel.current?.focus();
  }, [open]);
  const choose = (allow: boolean) => {
    try { localStorage.setItem(consentKey, allow ? 'accepted' : 'declined'); } catch { /* Choice remains valid on this page. */ }
    if (allow) enableAnalytics(); else disableAnalytics();
    setOpen(false);
    if (focusOnOpen.current) document.getElementById('analytics-preferences')?.focus();
    focusOnOpen.current = false;
  };
  return <aside ref={panel} id="consent" role="region" aria-labelledby="consent-title" hidden={!open} tabIndex={-1}>
    <h2 id="consent-title">{title}</h2><p>{body}</p>
    <div className="links">
      <Button id="analytics-accept" variant="primary" onClick={() => choose(true)}>{accept}</Button>
      <Button id="analytics-decline" onClick={() => choose(false)}>{decline}</Button>
    </div>
  </aside>;
}
