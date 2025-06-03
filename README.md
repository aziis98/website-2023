# Website 2023: [aziis98.com](https://aziis98.com)

I finally wrote my website with <https://astro.build/> which seems very
promising.

For now, there is an articles section that already supports MDX, which I think
will be great to use, and a section with artistic stuff I've done over time.

## Setup

I've recently been using <https://pnpm.io/it/>

```bash shell
$ bun install
```

## Deploy

### aziis98.com

Netlify is nice and does it all by itself.

### ~~Poisson~~

To build the site for <https://poisson.phc.dm.unipi.it/~delucreziis/> you need
to use the following commands

```bash shell
$ pnpm run build:poisson
$ rsync -cavzP out/ delucreziis@poisson.phc.dm.unipi.it:public_html/
```

Maybe later I will also automate this step with some _GitHub Actions_ but it
seems that it is more complicated than expected to make an _Action_ that uses
rsync in a secure way (bla bla _known hosts_).

### GitHub Action

To deploy the site to Poisson I now use a simple github action, better explained
[in this PHC guide I wrote](https://phc.dm.unipi.it/guide/deploy-with-github-actions/).
