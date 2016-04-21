[![Literate programming][literate-image]][literate-url]

# Screen Router as Finite State Machine

**StateMachineRouter** allows you to describe the "history-driven" screen transitions in declarative manner.

## Status
In progress...

## Usage

```javascript
import { Router } from 'state-machine-router';

let router = new Router({
    index: {
        url   : '/',
        title : 'Demo Appication',

        transitions : {
            'users_requested' : 'users',
            'about_requested' : 'about'
        },

        enter  : showIndex
    },

    users: {
        url   : '/users/',
        title : 'Users Info',

        transitions : {
            'userDetails_requested' : 'userDetails',
            'about_requested'       : 'about'
        },

        enter  : showUsers
    },

    userDetails: {
        // http://www.regular-expressions.info/named.html
        url      : '/users/(:<userId>[0-9]+)/',
        title    : 'User Details',

        transitions : {
            'back_requested'            : 'users',
            'userDetails_requested'     : 'userDetails',
            'userBookDetails_requested' : 'userBookDetails',
            'about_requested'           : 'about'
        },

        enter  : showUser
    },

    userBookDetails: {
        url      : '/users/(:<userId>[0-9]+)/book/(:<bookId>[0-9]+)/',
        title    : 'Book Details',

        transitions : {
            'userDetails_requested' : 'userDetails',
            'about_requested'       : 'about'
        },

        enter  : showUserBook
    },

    about: {
        url      : '/about/',
        title    : 'About',

        transitions : {
            'index_requested': 'index'
        },

        enter  : showAbout
    }
});


router.start();


function showIndex(router, data, meta) {
	return new Promise((resolve) => {
		// load and render screen teplate, etc
		...

		// then, on some Users's click
		router.process('users_requested');
	});
}

...
```

## Features
- automatically calculates the router's state from the `window.location.href`, on page load
- named regexp in URL definition

## License

[MIT-LICENSE](https://github.com/AZaviruha/state-machine-router/blob/master/LICENSE)

[literate-image]: https://img.shields.io/badge/literate%20programming--brightgreen.svg
[literate-url]: https://en.wikipedia.org/wiki/Literate_programming
