---
layout: ../../layouts/ArticleLayout.astro
title: Nuovo sito
description: In questo articolo annuncio finalmente il mio nuovo sito realizzato con Astro e spiego un po' come funziona
tags: ["website", "astro", "webdev"]
publish_date: 2023/04/03 17:00
---

# Nuovo sito

Questo è il mio nuovo sito realizzato con [Astro](https://astro.build/) ed hostato su [aziis98.com](https://aziis98.com) e su [Poisson](https://poisson.phc.dm.unipi.it/~delucreziis). Per ora non c'è ancora molto ma già ho aggiunto un po' di _feature_ interessanti come il supporto per il latex, ad esempio posso scrivere $1 + 1 = 2$, anche per blocchi _display_

$$
\sum_{n > 0} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

Poi il sito è già abbastanza _responsive_, dovrebbe funzionare discretamente bene sia su telefoni, tablet e desktop.

## Build & Deploy

Il codice è tutto in [una repo su GitHub](https://github.com/aziis98/website-2023) e viene renderizzato da [Netlify](https://netlify.com/) (servizio a caso che hosta siti gratis su uno loro sotto-dominio) in automatico quando pusho. La cosa simpatica di Netlify è che non serve alcuna configurazione in più nella propria repo e fa anche tutta la build da solo.

Per Poisson invece build-o in locale e poi uso rsync per caricare i file generati nella mia `public_html/`, più avanti forse proverò ad automatizzare anche questo passaggio.

## Conclusione

Spero finalmente di iniziare ad usare questo sito in modo continuativo perché non mi dispiacerebbe per niente iniziare a scrivere un po' di articoli sia in cui racconto delle cose che facciamo al [PHC](https://poisson.phc.dm.unipi.it) o di miei progettini a caso in generale.

Probabilmente uno dei primi articoli sarà una trascrizione del [talk sulle generics in Go](https://github.com/aziis98/talk-intro-go-generics) fatto alla DevFest il 1 Aprile 2023.
