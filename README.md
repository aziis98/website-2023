# Website 2023: [aziis98.com](https://aziis98.com)

Finalmente ho scritto il mio sito con <https://astro.build/> che sembra molto promettente.

Per ora c'è una sezione articoli che già supporta l'MDX che è penso sarà molto bll da usare ed una sezione con roba artistica che ho fatto nel corso del tempo.

## Setup

Recentemente uso sempre <https://pnpm.io/it/>

```bash shell
$ pnpm install
```

## Deploy

### aziis98.com

Netlify è bello e fa tutto da solo.

### Poisson

Per costruire il sito per <https://poisson.phc.dm.unipi.it/~delucreziis/> si bisogna usare i seguenti comandi

```bash shell
$ pnpm run build:poisson
$ rsync -avzP out/ delucreziis@poisson.phc.dm.unipi.it:public_html/
```

Forse più avanti automatizzerò anche questo passaggio con delle _GitHub Actions_ ma sembra che sia più complicato del previsto fare un'_Action_ che usi rsync in modo sicuro (bla bla _known hosts_).
