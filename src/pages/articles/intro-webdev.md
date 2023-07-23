---
layout: ../../layouts/ArticleLayout.astro
title: Introduzione allo Sviluppo Web
description: In questo articolo introduco un po' lo sviluppo web moderno, prima parlando un po' di design di interfacce grafiche in generale e poi introducendo HTML, CSS ed infine JS.
tags: ["webdev", "design", "html", "css", "lang-it"]
publish_date: 2023/06/14
draft: true
thumbnail: "/data/thumbnails/new-webiste.jpeg"
---

<style>
    .example {
        max-width: 32rem; margin: 0 auto;
        padding: 2.5rem 1rem 2rem;

        z-index: 0;
        overflow-x: auto;

        display: grid;
        place-content: stretch;
    }
    .box {
        display: grid;
        gap: 1.5rem;
        padding: 1.5rem;
        
        z-index: 0;        

        place-content: center;
        font-size: 110%;
        font-weight: 600;
        color: #444;

        position: relative;

        border-radius: 2px;

        background: #fff;
    }
    .box::before {
        position: absolute;
        inset: 0;
        background: #fff;
        z-index: -1;
        content: '';
    }
    .box > .label {
        position: absolute;
        display: inline-block;

        bottom: calc(100%);
        left: -2.5px;
        font-size: 12.5px;
        padding: 1px 3px 2px;
        z-index: -2;

        border-radius: 3px;

        transition: all 150ms ease-in-out;
        width: max-content;
    }
/*  
    @media screen and (pointer: fine) {
        .box > .label {
        }
        .box:not(:hover) > .label {
            transform: translate(0, +100%);
            opacity: 0;
        }
    }
*/  
    .box.parent > .label {
        background: lightsteelblue;
        color: darkslategray;
    }
    .box.child > .label {
        background: slateblue;
        color: lightgray;
    }
    .parent {
        border: 3px solid lightsteelblue;
    }
    .child {
        border: 3px solid slateblue;
    }
    .grid { 
        display: grid;
    }
</style>

# Introduzione allo Sviluppo Web

Allora per cominciare intanto preciso che non serve nulla oltre ad un computer con una tastiera per poter seguire questa guida. Ad un certo punto faremo qualche esperimento con del codice e servirà un qualsiasi editor di testo (ad esempio [VSCode](https://code.visualstudio.com/)) e [NodeJS e npm](#) installati.

## Design

Se pensavi di imparare a fare un sito web in realtà una buona parte di questo articolo è una spiegazione di come funzionano certi concetti di interfacce grafiche abbastanza generali.

### HTML

L'HTML serve a descrivere l'albero degli elementi sulla nostra pagina, come vedremo in seguito un elemento corrisponderà indicativamente ad un rettangolo sulla nostra pagina.

Giusto per vederlo una prima volta una pagina HTML è ad esempio la seguente

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pagina di Esempio</title>
    </head>
    <body>
        <h1>Esempio</h1>
        <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere voluptate sequi sint tenetur quibusdam officiis temporibus, quam sit eum
            excepturi!
        </p>
    </body>
</html>
```

Bla bla bla XML... Il vero contenuto della nostra paigna è quanto contenuto dentro `<body>...</body>`, l'unico altro elemento degno di nota per ora è `<title>Pagina di Esempio</title>` che specifica il titolo della nostra pagina web.

In HTML ci sono alcuni tag speciali come `<h1>...</h1>`, `<h2>...</h2>`, ..., `<p>...</p>`, `<strong>...</strong>`, `<em>...</em>`, `<a href="...">...</a>` che hanno un significato specifico.

Altri invece come `<div>` e `<span>` sono elementi "generici" che possono essere usati a piacimento nella pagine per descrivere come posizionare i vari elementi. Da quanto è stato introdotto l'HTML5 è molto comune usarli, più precisamente i `<div>` vanno usati assieme all'attributo `class` per distinguere vari tipi di elementi, ad esempio

```html
<div class="card">
    <div class="title">...</div>
    <div class="tags">
        <div class="tag">#tag-1</div>
        <div class="tag">#tag-2</div>
        <div class="tag">#tag-3</div>
    </div>
    <div class="picture">
        <img src="..." alt="..." />
    </div>
    <div class="content">
        <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio aliquam soluta dolorum a eaque quidem, cumque sed laborum, esse? Esse.
        </p>
        <p>
            Fuga rem, animi iusto ad praesentium ut incidunt ducimus dignissimos beatae? Aspernatur deserunt repellendus voluptate cupiditate sequi
            nam dolore expedita?
        </p>
    </div>
    <div class="footer">...</div>
</div>
```

Le classi ci permettono di taggare certi elementi con un'etichetta che poi potremo utilizzare in CSS per dare uno stesso stile a elementi con stesso tag.

### Scatole

Come già anticipato un elemento HTML corrisponde ad un rettangolo sullo schermo, più in generale tutte le interfacce grafiche moderne sono costituite da rettangoli, o più precisamente come nel caso del web da _rounded rectangles_. Eccone alcuni esempi

![Alcune scatole](/data/articles/intro-webdev/figure-1.svg)

Per quanto ci riguarda uno di questi rettangoli hanno varie proprietà

-   Coordinate x, y (con origine in alto a sinistra), larghezza e altezza.

-   Uno stile di bordo o _border_.

-   Ed uno di contenuto o _background_. 

-   Testo contenuto.

-   Altri rettangoli, ovvero dato che il nostro modello alla fine è l'HTML se un elemento è un rettangolo questo potrà contenere altri elementi ovvero altri rettangoli. 

### Layout

Quindi abbiamo questo problema di avere un rettangolo contenitore con tanti altri rettangoli all'interno che vorremmo posizionare relativamente al genitore.

Ci sono vari modi di fare questo, il modo brutale è quello di assegnare ad ogni figlio le coordinate e la larghezza e l'altezza a mano. Però questo è un po' scomodo, ci sono però alcuni "algoritmi" classici che sono molto usati in molti programmi di grafica.

#### Padding

Il primo parametro importante per ottenere dei design decenti è il padding, che essenzialmente indica quando il contenuto deve essere lontano dai bordi del contenitore. Più precisamente il padding si indica come distanza del contenuto dal brodo di sopra, destra, sotto e sinistra. Questo è anche l'ordine standard per indicare tutti i valori in CSS (seguendo l'orologio). Ad esempio

<div class="example">
    <div class="box grid parent" style="aspect-ratio: 16 / 10; padding: 10px 20px 40px 80px; place-content: stretch;">
        <div class="label">Contenitore con <em>padding</em> di $5\text{px}$, $1\text{0px}$, $2\text{0px}$, $4\text{0px}$</div>
        <div class="box child"></div>
    </div>
</div>

#### Grid

Quello forse più semplice da cui partire ma che paradossalmente è l'ultimo arrivato cronologicamente nei browser è il **layout a griglia**. Nel caso dei browser, per definire una griglia serve definire almeno un numero di righe o di colonne della nostra griglia (nel caso uno dei due viene omesso la griglia continuerà ad allargarsi nella direzione non specificata all'aumentare degli elementi)

<div class="example">
    <div class="box grid parent" style="grid-template-columns: 1fr 2fr 3fr 4fr;">
        <div class="label">Griglia $n \times 4$</div>
        <div class="box child">
            1
        </div>
        <div class="box child">
            2
        </div>
        <div class="box child">
            3
        </div>
        <div class="box child">
            4
        </div>
        <div class="box child">
            5
        </div>
        <div class="box child">
            6
        </div>
        <div class="box child">
            <div class="label">$(2, 3)$</div>
            7
        </div>
        <div class="box child">
            8
        </div>
        <div class="box child">
            9
        </div>
        <div class="box child">
            10
        </div>
        <div class="box child">
            11
        </div>
    </div>
</div>

L'altro parametro fondamentale oltre al numero di righe e colonne è la taglia di ogni riga ed ogni colonna. Vedremo che nei browser c'è un modo di specificare sia taglie relative che assolute, ad esempio possiamo dire che una colonna deve essere larga `250px` oppure il `25%` della taglia del contenitore. 

Ci sono però due unità speciali, intanto possiamo indicare come taglia `auto` che significherà che quella riga/colonna deve essere grande almeno quanto il contenuto. L'altra unità speciale è `fr`, ad esempio una griglia con colonne `auto 2fr 1fr` avrà 3 colonne, la prima che occuperà giusto lo spazio per il contenuto e lo spazio rimanente verrà spartito 2:1 con le ultime due colonne.

<div class="example">
    <div class="box grid parent" style="grid-template-columns: auto 2fr 1fr;">
        <div class="label">
            Griglia $n \times 3$, colonne: <code>auto</code>, <code>2fr</code>, <code>1fr</code>
        </div>
        <div class="box child">auto</div>
        <div class="box child">2fr</div>
        <div class="box child">1fr</div>
        <div class="box child">auto</div>
        <div class="box child">2fr</div>
    </div>
</div>

Un'altra proprietà importante, analoga al _padding_ è lo spazio tra una colonna e l'altra che come in realtà già stiamo vederndo in questi esempi ho impostato ad un valore non zero.

<div class="example">
    <div class="box grid parent" style="grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(4, 1fr); row-gap: 20px; column-gap: 5px;">
        <div class="label">
            griglia $4 \times 3$, gap di righe: $20\text{px}$, gap di colonne: $5\text{px}$
        </div>
        <div class="box child">1</div>
        <div class="box child">2</div>
        <div class="box child">3</div>
        <div class="box child">4</div>
        <div class="box child">5</div>
        <div class="box child">6</div>
        <div class="box child">7</div>
        <div class="box child">8</div>
        <div class="box child">9</div>
        <div class="box child">10</div>
    </div>
</div>

#### Flexbox

TODO

#### Block

Ho tenuto questo per ultimo anche se in realtà è il più antico, in particolare i primi due algoritmi di _layout_ sono stati introdotti relativamente di recente.

TODO

### CSS

TODO

#### Ereditarietà

TODO

#### Proprietà di Base

TODO