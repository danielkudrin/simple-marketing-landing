import axios from 'axios';
import Swal from 'sweetalert2';

class TimelineActiveClass {
  constructor(node) {
    this.nodes = document.querySelectorAll(node);
    this.bindEventListeners();
  }

  bindEventListeners() {
    this.nodes.forEach((node) => {
      let dot = node.lastChild.previousSibling;
      node.addEventListener('mouseover', (e) => {
        dot.classList.toggle('hovered');
      });
      node.addEventListener('mouseout', (e) => {
        dot.classList.toggle('hovered');
      });
    });
  }
}

class ItemActiveClass {
  constructor(node) {
    this.nodes = document.querySelectorAll(node);
    this.bindEventListeners();
  }

  bindEventListeners() {
    this.nodes.forEach((node) => {
      node.addEventListener('click', (e) => {
        if (e.currentTarget.classList.contains('active')) {
          e.currentTarget.classList.remove('active');
        } else {
          e.currentTarget.classList.add('active');
        }
      });
    });
  }
}

class MobileNav {
  constructor() {
    this.toggler = document.querySelector('.mobile-nav-toggle');
    this.backdrop = document.querySelector('.main');
    this.cancel = document.querySelector('.menu-close');

    this.bindEventListeners();
  }

  bindEventListeners() {
    this.toggler.addEventListener('click', () => this.showMenu());

    window.addEventListener('click', (e) => {
      this.hideMenu(e.target);
    });
  }

  hideMenu(target) {
    if (target === this.backdrop || target === this.cancel) {
      document.body.classList.remove('menu-open');
    }
  }

  showMenu() {
    document.body.classList.add('menu-open');
  }
}

class SmoothScroll {
  constructor() {
    this.target = document.querySelectorAll('.smooth-scroll');
    this.bindEventListeners();
  }

  bindEventListeners() {
    this.target.forEach((t) => {
      t.addEventListener('click', (e) => {
        e.preventDefault();
        let href = e.target.getAttribute('href').slice(1);
        let top = this.getTargetTopPos(href);

        if (href === 'welcome') {
          this.scrollToElement(0);
        } else if (href === 'contacts') {
          this.scrollToElement(this.getTargetTopPos('contacts') - 75);
        } else {
          this.scrollToElement(top - 30);
        }

        this.hideMenu();
      });
    });
  }

  getTargetTopPos(href) {
    return document.getElementById(href).offsetTop;
  }

  hideMenu() {
    if (document.body.classList.contains('menu-open')) {
      document.body.classList.remove('menu-open');
    }
  }

  scrollToElement(top) {
    window.scroll({
      top,
      left: 0,
      behavior: 'smooth',
    });
  }
}

function shrinkHeader() {
  const header = document.querySelector('.header');
  if (window.innerWidth > 600) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 50) {
        header.classList.add('shrink');
      } else {
        header.classList.remove('shrink');
      }
    });
  }
}

class FormSubmit {
  constructor(form) {
    this.form = document.querySelector(form);
    this.submit = this.form.querySelectorAll('.btn-submit');

    this.bindEventListeners();
  }

  bindEventListeners() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.post();
    });
  }

  submitStatus(status) {
    this.submit.forEach((s) => {
      if (status === 'disable') {
        s.classList.add('disabled');
      } else {
        s.classList.remove('disabled');
      }
    });
  }

  enableSubmit() {
    this.submit.forEach((s) => {
      s.classList.add('disabled');
    });
  }

  clearInputs() {
    let fields = document.querySelectorAll('.field');
    fields.forEach((f) => {
      f.value = '';
    });
  }

  getInputValue(name) {
    let el = this.form.querySelector(`[name="${name}"]`);
    if (!el) return '';
    return el.value;
  }

  getSearchParam(name) {
    let url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  post() {
    let self = this;
    let data = {
      type: this.getInputValue('type'),
      email: this.getInputValue('email'),
      message: this.getInputValue('message'),
      utm_campaign: this.getSearchParam('utm_campaign'),
      utm_content: this.getSearchParam('utm_content'),
      utm_medium: this.getSearchParam('utm_medium'),
      utm_source: this.getSearchParam('utm_source'),
      utm_term: this.getSearchParam('utm_term'),
    };

    self.submitStatus('disable');
    grecaptcha.ready(function () {
      grecaptcha
        .execute('yourRecaptchaCodeHere', {
          action: 'submit',
        })
        .then((token) => {
          axios
            .post(
              'yourApiLink.com/foobar',
              Object.assign(data, { token })
            )
            .then(() => {
              self.clearInputs();
              self.submitStatus('enable');
              Swal.fire({
                icon: 'success',
                title: 'Спасибо за Ваше сообщение!',
                text: 'С Вами свяжутся в ближайшее время',
                showConfirmButton: false,
                timer: 5000,
              });
              dataLayer.push({ event: 'form-submit' });
            })
            .catch(() => {
              self.clearInputs();
              self.submitStatus('enable');
            });
        })
        .catch((err) => console.log('RECAPTCHA', err));
    });
  }
}

new MobileNav();
shrinkHeader();
new SmoothScroll();
new ItemActiveClass('.accordion__item');
new FormSubmit('#form-top');
new FormSubmit('#form-bot');
new TimelineActiveClass('.timeline__item');
