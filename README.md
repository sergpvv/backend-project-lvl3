# "page-loader"

[![Maintainability](https://api.codeclimate.com/v1/badges/78bcb5e1308888cb666e/maintainability)](https://codeclimate.com/github/sergpvv/backend-project-lvl3/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/78bcb5e1308888cb666e/test_coverage)](https://codeclimate.com/github/sergpvv/backend-project-lvl3/test_coverage)
[![Build Status](https://travis-ci.org/sergpvv/backend-project-lvl3.svg?branch=master)](https://travis-ci.org/sergpvv/backend-project-lvl3)

Download target page with all resources.
Third training project by [Hexlet](https://hexlet.io/#features) on the profession ["JS backend"](https://hexlet.io/professions/backend).

## Setup

```sh
$ make install
```

## Usage
### Console utility
```sh
$ page-loader [options] <url>

Download target page with all resources.

Options:
  -v, --version        Output the version number
  -o, --output         Specify output directory
  -h, --help           Output usage information

```
### API
```
import getPage from 'getPage';
```

