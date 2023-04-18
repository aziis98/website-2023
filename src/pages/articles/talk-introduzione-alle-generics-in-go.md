---
layout: ../../layouts/ArticleLayout.astro
title: Introduzione alle Generics in Go
description: Questo articolo è la versione in forma scritta del talk con lo stesso nome tenuto alla DevFest di Pisa il 2023/04/01
tags: ["go", "generics"]
publish_date: 2023/04/17
---

# Introduzione alle Generics in Go

Nella versione 1.18 del Go hanno introdotto le generics, questo è stato uno dei cambiamenti più grossi al linguaggio dal primo rilascio nel mondo open source.

Giusto per info, le slide originali e tutto il codice derivato da questo talk si trovano nella pagina <https://github.com/aziis98/talk-intro-go-generics>.

## Il problema

Prima dell'introduzione delle generics in Go se uno voleva scrivere una funzione per calcolare il minimo tra due numeri ad esempio come

```go
func Min(x, y int) int {
    if x < y {
        return x
    }

    return y
}
```

e voleva utilizzarla anche per altri tipi serviva copia-incollarla cambiando il nome e modificando il tipo in base a quello che uno voleva usare.

```go
func MinInt8(x, y int8) int8 {
    if x < y {
        return x
    }

    return y
}

func MinInt16(x, y int16) int16 {
    if x < y {
        return x
    }

    return y
}

func MinFloat32(x, y float32) float32 {
    if x < y {
        return x
    }

    return y
}
```

Come possiamo notare in questo caso l'implementazione della funzione è sempre la stessa e non dipende dal tipo specifico che stiamo utilizzando. Quindi seguendo il principio [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) sarebbe meglio non stare a ricopiare ogni volta lo stesso codice.

```go
...
if x < y {
    return x
}

return y
...
```

Alternativamente un'altra soluzione pre-generics sarebbe quella di far prendere parametri di tipo `any` e mettere dentro la funzione degli `switch` sul tipo. In alcuni casi questo potrebbe essere ragionevole ma spesso non è molto pulito come nel caso della funzione minimo, specialmente se vogliamo scrivere codice generico per tipi primitivi.

Inoltre se una funzione prende input di tipo `any` perdiamo tutta la _type-safety_ a _compile-time_ ed appesantiamo il lavoro dal fare a _runtime_ (senza parlare che ora dobbiamo passare in giro dei puntatori).

Un'altro modo è di usare go generate con alcuni tool che generano tutte le varianti di una funzione. Questa tecnica è già più ragionevole ma complica il modo di build-are il proprio progetto.

## Soluzione: Le Generics

Ormai già da qualche versione possiamo scrivere la seguente funzione

### Type Parameters

```go
import "golang.org/x/exp/constraints"

func Min[T constraints.Ordered](x, y T) T {
    if x < y {
        return x
    }
    return y
}
```

Vedremo meglio più avanti cosa significa di preciso questa notazione, in breve `T` è il nuovo tipo generico che stiamo introducendo, `constraints.Ordered` è il vincolo che stiamo imponendo su `T`.

Possiamo utilizzare la funzione in due modi, o chiamando la funzione e specificando il _type parameter_ esplicitamente come segue

```go
var a, b int = 0, 1
Min[int](a, b)
...
var a, b float32 = 3.14, 2.71
Min[float32](a, b)
```

oppure in molti casi possiamo sottointenderlo e scrivere direttamente

```go
var a, b int = 0, 1
Min(a, b)
...
var a, b float32 = 3.14, 2.71
Min(a, b)
```

### Type Sets

Più precisamente la notazione per introdurre una generics è della forma `[T Vincolo1, R interface{ Method(), ... }, ...]`, possiamo introdurre tutti i tipi parametrici che vogliamo scrivendo prima il nome della _type parameter_ e poi il vincolo sottoforma di alias o per esteso scrivendo `interface{ <vincoli...> }`.

In particolare tutti i vincoli sono delle interfacce del Go. In realtà è stata estesa la sintassi delle interfacce del Go per poter ammettere dei cosidetti _type sets_.

Un modo per pensare le interfacce in Go è attraverso il concetto di _method set_, un tipo soddisfa un'interfaccia se il suo _method set_ contiene il _method set_ definito dall'interfaccia.

![go method sets](https://go.dev/blog/intro-generics/method-sets.png)

Un modo alternativo (duale) di vedere la cosa è di pensare al _type set_ generato da un'interfaccia, ovvero all'insieme di tutti i tipi (in astratto) che soddisfano quell'interfaccia. A quel punto dato un tipo per vedere se soddisfa o meno l'interfaccia basta vedere se è o meno nel _type set_ dell'interfaccia.

![go type sets 1](https://go.dev/blog/intro-generics/type-sets.png)

La nuova sintassi che è stata introdotta per le interfacce è la seguente e ci permette di "forzare" i tipi di base che sono nel _type set_ di un'interfaccia.

![go type sets 2](https://go.dev/blog/intro-generics/type-sets-2.png)

Ad esempio in questo caso l'interfaccia se usata come vincolo per una generics ammetterà solo questi tre tipi.

In particolare è anche stato aggiunto un po' di zucchero sintattico per quando scriviamo i vincolo

-   `[T interface{}]` si può anche scrivere `[T any]`

-   `[T interface{ int | float32 }]` si può direttamente scrivere come `[T int | float32]`

Vediamo un ad esempio come scrivere una funzione generica sui tipi "floating"

```go
func Somma[T float32|float64](x, y T) T {
    return x + y
}
```

In qualche sitazione potremmo avere ad esempio un tipo sinonimo di `float64` come

```go
type Liter float64
```

di base con questo tipo "sinonimo" non possiamo usare la fuzione di sopra perché il tipo `Liter` e `float64` sono effettivamente tipi diversi.

```go
var a, b int = 1, 2
Somma(a, b) // Ok

var a, b Liter = 1, 2
Somma(a, b) // Errore
```

Se però (come in questo caso) vogliamo rilassare il vincolo possiamo aggiungere una `~` prima del nome del tipo primitivo nel _type set_

```go
func Somma[T ~float32|~float64](x, y T) T {
    return x + y
}
```

```go
type Liter float64
```

```go
var a, b int = 1, 2
Somma(a, b) // Ok

var a, b Liter = 1, 2
Somma(a, b) // Ok
```

In realtà questo vincolo è già definito nel pacchetto `constraints` usato prima

```go
package constraints

...

type Float interface {
    ~float32 | ~float64
}

...
```

ed in realtà anche `constraints.Ordered` si trova qui ed è definito come segue

```go
package constraints

...

type Ordered interface {
    Integer | Float | ~string
}

type Float interface {
    ~float32 | ~float64
}

type Integer interface {
    Signed | Unsigned
}

type Signed interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64
}

type Unsigned interface {
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr
}

...
```

(essenzialmente sono andati a vedere secondo la _spec_ del Go quali sono i tipi che supportano `<` e `>` e li hanno hardcodati dentro `Ordered`)

## Tipi Generici

Vediamo ora come creare dei tipi generici, ad esempio possiamo definire uno _stack_ come segue

```go
type Stack[T any] []T
```

Per scrivere i metodi possiamo fare come segue, reintroducendo il tipo generico nel _receiver_ del metodo.

```go
func (s *Stack[T]) Push(value T) {
    *s = append(*s, value)
}

func (s Stack[T]) Peek() T {
    return s[len(s)-1]
}

func (s Stack[T]) Len() int {
    return len(s)
}
```

Vediamo ora il metodo _pop_ che è leggermente più interessante. Decidiamo che ritornerà `0, false` se lo stack era vuoto o altrimenti `<elemento in cima>, true`.

```go
func (s *Stack[T]) Pop() (T, bool) {
    items := *s

    if len(items) == 0 {
        var zero T
        return zero, false
    }

    newStack, poppedValue := items[:len(items)-1], items[len(items)-1]
    *s = newStack

    return poppedValue, true
}
```

Il primo "pattern" interessante che notiamo con le generics è quello della variabile `zero`, possiamo estrarre questo pattern direttamente in una funzione _utility_ come segue

```go
func Zero[T any]() T {
    var zero T
    return zero
}
```

Per ora ci tocca definire sempre a mano la variabile `var zero T` se vogliamo utilizzare il valore "`0`" per un certo tipo però questo problema è già stato riscontrato da altre persone e già si sta [pensando a delle soluzioni](https://go.googlesource.com/proposal/+/refs/heads/master/design/43651-type-parameters.md#the-zero-value).

## Pattern: Tipi Contenitore

### Tipi generici nativi

Fin dal principio il Go ha avuto i seguenti tipi generici _backed-in_ ovvero

-   `[n]T`

    Array di `n` elementi per il tipo `T`

-   `[]T`

    Slice per il tipo `T`

-   `map[K]V`

    Mappe con chiavi `K` e valori `V`

-   `chan T`
    Canali per elementi di tipo `T`

Però c'è sempre stato il problema che non era possibile definire funzioni generiche per questi tipi, anzi era idiomatico in Go ripetere sempre l'implementazione imperativa di certe operazioni molto comuni come trovare un elemento in uno slice.

Ora finalmente possiamo definirle in modo genrico ed in realtà è già stato creato il pacchetto `golang.org/x/exp/slices` che contiene una manciata di queste funzioni utili

-   `func Index[E comparable](s []E, v E) int`
-   `func Equal[E comparable](s1, s2 []E) bool`
-   `func Sort[E constraints.Ordered](x []E)`
-   `func SortFunc[E any](x []E, less func(a, b E) bool)`
-   e molte altre...

ed invece `golang.org/x/exp/maps` per le mappe in Go

-   `func Keys[M ~map[K]V, K comparable, V any](m M) []K`
-   `func Values[M ~map[K]V, K comparable, V any](m M) []V`
-   e molte altre...

### Strutture dati generiche

Stanno anche nascendo librerie con già molte strutture dati generiche come ad esempio <https://github.com/zyedidia/generic> (che ha già circa 1K stelle su su GitHub)

-   `mapset.Set[T comparable]`, set basato su un dizionario.
-   `multimap.MultiMap[K, V]`, dizionario con anche più di un valore per chiave.
-   `stack.Stack[T]`, internamente è solo uno slice ha un'interfaccia più simpatica rispetto al modo idiomatico del Go prima delle generics.
-   `cache.Cache[K comparable, V any]`, dizionario basato su `map[K]V` con una taglia massima e rimuove gli elementi usando la strategia LRU.
-   `bimap.Bimap[K, V comparable]`, dizionario bi-direzionale.
-   `hashmap.Map[K, V any]`, implementazione alternativa di `map[K]V` con supporto per _copy-on-write_.
-   e molte altre...

## Alcuni Anti-Pattern

### Utility HTTP

Diciamo che vogliamo scrivere una funzioni di utility faccia la decodifica di una richiesta HTTP e validi anche il contenuto della richiesta usando l'interfaccia `Validator` come segue

```go
// library code
type Validator interface {
    Validate() error
}

func DecodeAndValidateJSON[T Validator](r *http.Request) (T, error) {
    var value T
    if err := json.NewDecoder(r.Body).Decode(&value); err != nil {
        var zero T
        return zero, err
    }

    if err := value.Validate(); err != nil {
        var zero T
        return zero, err
    }

    return value, nil
}
```

Da utilizzare come uno si aspetti (giusto un esempio veloce, non serve concentrarsi troppo su tutto questo codice)

```go
// client code
type FooRequest struct {
    A int    `json:"a"`
    B string `json:"b"`
}

func (foo FooRequest) Validate() error {
    if foo.A < 0 {
        return fmt.Errorf(`parameter "a" cannot be lesser than zero`)
    }
    if !strings.HasPrefix(foo.B, "baz-") {
        return fmt.Errorf(`parameter "b" has wrong prefix`)
    }

    return nil
}
```

```go
foo, err := DecodeAndValidateJSON[FooRequest](r)
if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
}
```

In realtà in questo caso non serve veramente introdurre un _type parameter_, potevamo scrivere già questa utility senza genrics passando una variabile di tipo _any_

```go
func DecodeAndValidateJSON(r *http.Request, target Validator) error {
    err := json.NewDecoder(r.Body).Decode(target)
    if err != nil {
        return err
    }

    if err := target.Validate(); err != nil {
        return err
    }

    return nil
}
```

```go
var foo FooRequest
if err := DecodeAndValidateJSON(r, &foo); err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
}
```

Che si comporta esattamente come prima ed è leggermente più semplice concettualmente.

Intuitivamente quello che fa il compilatore del Go quando c'è una funzione generica è di copia-incollare la funzione con tipi parametrici per ogni tipo nel chiamante. Quindi ci potremmo chiedere se effettivamente sia comunque più performante utilizzare le _generics_ nel caso precedente. Cambiamo esempio per vedere meglio:

### Confronto: Generics vs Interfacce

Consideriamo le due seguenti funzioni

```go
func WriteOneByte(w io.Writer, data byte) {
    w.Write([]byte{data})
}

...

d := &bytes.Buffer{}
WriteOneByte(d, 42)
```

```go
func WriteOneByte[T io.Writer](w T, data byte) {
    w.Write([]byte{data})
}

...

d := &bytes.Buffer{}
WriteOneByte[*bytes.Buffer](d, 42)
```

A primo impatto potremmo pensare che la prima sia più lenta perché stiamo passando una variabile di tipo `*bytes.Buffer` ad una funzione che prende un'interfaccia `io.Writer` qundi già in qualche modo ci dovrebbe essere un primo passaggio di conversione. Inoltre quando dentro la funzione chiamiamo `.Write(...)` in qualche modo il Go dovrà passare dalla vtable per capire che funzione chiamare.

In realtà se facciamo un piccolo _benchmark_ vediamo che

```
BenchmarkInterface
BenchmarkInterface-4            135735110            9.017 ns/op

BenchmarkGeneric
BenchmarkGeneric-4              50947912            22.26 ns/op
```

la prima funzione in realtà è quella più veloce tra le due, anzi è veloce praticamente il doppio.

Se proviamo ad aggiungere l'annotazione `//go:noinline` alla prima funzione possiamo iniziare ad intuire cosa sta succedendo

```go
//go:noinline
func WriteOneByte(w io.Writer, data byte) {
    w.Write([]byte{data})
}
```

perché ora rifacendo il _benchmark_ i risultati della funzione generica e di quella senza _inline_ sono circa uguali.

```
BenchmarkInterface
BenchmarkInterface-4            135735110            9.017 ns/op

BenchmarkInterfaceNoInline
BenchmarkInterfaceNoInline-4    46183813            23.64 ns/op

BenchmarkGeneric
BenchmarkGeneric-4              50947912            22.26 ns/op
```

Cioè che sta succendendo dipende dal fatto che il compilatore del Go in realtà è molto bravo a trattare le interfacce ed in questo caso semplicemente utilizzando la strategia dell'_inlining_ riesce a ottimizzare parecchio la funzione e saltare molti passaggi inutili.

```go
d := &bytes.Buffer{} /* (*bytes.Buffer) */
WriteOneByte(d /* (io.Writer) */, 42)
```

<div style="text-align: center; font-size: 125%;">↓</div>

```go
d := &bytes.Buffer{} /* (*bytes.Buffer) */
(io.Writer).Write(d /* (io.Writer) */, []byte{ 42 })
```

<div style="text-align: center; font-size: 125%;">↓</div>

```go
d := &bytes.Buffer{} /* (*bytes.Buffer) */
(*bytes.Buffer).Write(d /* (*bytes.Buffer) */, []byte{ 42 })
```

### Go 1.18 Implementation of Generics via Dictionaries and GCShape Stenciling

Vediamo meglio come funziona l'implementazione delle generics nel Go.

-   _A **gcshape** (or gcshape grouping) is a collection of types that all **share the same instantiation of a generic function/method**_.

    È stato introdotto questo concetto delle _GCShape_ che rappresenta un insieme di tipi che ammettono la stessa specializzazione per una funzione generica.

-   _Two concrete types are in the same gcshape grouping if and only if they have the **same underlying type** or they are **both pointer types**._

    Due tipi hanno la stessa _GCShape_ se e solo se sono lo stesso tipo o se entrambi sono "tipi puntatore" (quindi ad esempio `*int` e `*http.Request` essendo entrambi _pointer types_ avranno la stessa _GCShape_)

    Questo compromesso serve principalmente per ridurre la dimensione degli eseguibili e per tenere veloce il compilatore del Go.

-   _To avoid creating a different function instantiation for each generic call with distinct type arguments (which would be pure stenciling), we **pass a dictionary along with every call**_.

    Raggruppare insieme alcuni tipi nella stessa specializzazione introduce il problema che poi a _runtime_ in certi casi serve sapere con che tipo stiamo lavorando (ad esempio quanod facciamo il cast da o verso un'interfaccia). Quindi sono stati introdotti anche questi dizionari che vengono passati assieme ad ogni chiamata e contengono tutte le informazioni sui tipi della chiamata generica.

## Pattern: Type-safe Database API

Vediamo un analogo di `PhantomData<T>` dal Rust per rendere _type-safe_ l'interfaccia di una libreria. In molti linguaggi con le _generics_ ci sono casi in cui può essere utile definire un tipo generico senza però usare la generics all'interno della definizione (in Rust questo da proprio errore di base quindi è stato introdotto il tipo `PhantomData<T>` per questi casi).

Spesso ad esempio quando lavoriamo con un database ci tocca passare in giro nella nostra applicazione _ID_ di righe nel database per varie entità (utenti, prodotti, ...). E se non stiamo attenti può succedere di sbagliarsi e passare l'ID di un utente come ID di un prodotto e viceversa.

### L'idea

Proviamo ad usare la tecnica citata sopra per rendere _type-safe_ l'interfaccia con `*sql.DB`. Introduciamo alcuni tipi

```go
type DatabaseRef[T any] string
```

questo tipo `DatabaseRef[T]` rappresenterà un _ID_ tipato da passare in giro nella nostra applicazione

```go
package tables

// tables metadata
var Users = database.Table[User]{ ... }
var Products = database.Table[Product]{ ... }
```

Poi ad esempio possiamo introdurre una lista di tabelle tipate come qui sopra in modo da poter anche verificare che anche le operazioni facciamo sul nostro database siano sulle entità giuste.

E poi l'idea è che potremo interagire in questo modo con il database utilizzando alcune funzioni `Create`, `Read`, `Update`, `Delete` che controllano che il tipo della tabella che stiamo usando sia lo stesso della referenza che gli stiamo passando.

```go
userRef1 := DatabaseRef[User]("j.smith@example.org")
...

// Ok
user1, err := database.Read(dbConn, tables.Users, userRef1)
// Errore
user2, err := database.Read(dbConn, tables.Products, userRef1)
```

### Implementazione

Definiamo i seguenti tipi in un modulo chiamato `database`

-   L'interfaccia `WithPK` rappresenterà un tipo con _primary key_ ed in particolare ci ritornerà un puntatore al sua campo _primary key_.

-   Come detto prima `Ref[T]` a runtime sarà sempre una stringa ma a compile time tutti i tipi `Ref[User]`, `Ref[Product]`, etc. saranno trattati come tipi diversi.

-   Infine il tipo `Table[T]` conterrà alcuni metadati per costruire le query per il nostro _database_ e ripopolare le struct che ritorneremo.

```go
package database

type WithPK interface {
    PrimaryKey() *string
}

type Ref[T WithPK] string

type Table[T WithPK] struct {
    Name     string
    PkColumn string
    Columns  func(*T) []any
}
```

A questo punto definiamo le funzione per eseguire le nostre operazioni [CRUD](#todo) come segue

```go
package database

...

func Create[T WithPK](d DB, t Table[T], row T) (Ref[T], error)

func Insert[T WithPK](d DB, t Table[T], row T) (Ref[T], error)

func Read[T WithPK](d DB, t Table[T], ref Ref[T]) (*T, error)

func Update[T WithPK](d DB, t Table[T], row T) error

func Delete[T WithPK](d DB, t Table[T], id Ref[T]) error
```

come possiamo vedere stiamo introducendo il _type parameter_ `T` e poi lo stiamo utilizzando per forzare che quando passiamo `Table[T]` e un valore abbiamo lo stesso tipo.

Giusto per dare un'idea vediamo come si potrebbe implementare la funzione `Read`

```go
func Read[T WithPK](d DB, t Table[T], ref Ref[T]) (*T, error) {
    result := d.QueryRow(
        fmt.Sprintf(
            `SELECT * FROM %s WHERE %s = ?`,
            t.Name, t.PkColumn,
        ),
        string(ref),
    )

    var value T
    if err := result.Scan(t.Columns(&value)...); err != nil {
        return nil, err
    }

    return &value, nil
}
```

L'unica cosa da osservare è che stiamo facendo interpolazione per costruire la query giusta ma non comporta veramente problemi di _sql injection_ perché l'idea sarebbe che tutti i metadati sulle tabelle siano noti a _compile time_.

Vediamo un breve esempio di come utilizzare questa "libreria", possiamo definire così un tipo che rappresenti un nostro utente

```go
package model

type User struct {
    Username  string
    FullName  string
    Age       int
}

func (u *User) PrimaryKey() *string {
    return &u.Username
}
```

Ed invece come segue i metadati per la tabella `Users`, in particolare la funzione `Columns` qui l'ho scritta a mano ma penso si dovrebbe poter generare all'avvio del programma con un po' di _reflection_

```go
package tables

var Users = Table[User]{
    Name: "users",
    PkColumn: "username",
    Columns: func(u *User) []any {
        return []any{ &u.Username, &u.FullName, &u.Age }
    }
}
```

In conclusione possiamo anche utilizzare le **generics** per rendere **type-safe** l'interfaccia di qualcosa che inizialmente non lo era.

## Pattern: Channels

Vediamo qualche _utility_ per lavorare meglio con i _channel_. Intanto definiamo la seguente _utility_ che ci permette di inviare un valore ad un channel se in quel momento era libero di accettare valori.

```go
func trySend[T any](c chan<- T, v T) bool {
    select {
    case c <- v:
        return true
    default:
        return false
    }
}
```

E possiamo utilizzarla per definire ad esempio questa funzione per fare una "gara" tra vari channel e vedere chi ritorna per primo un risultato.

```go
func raceSame[T any](cs ...<-chan T) T {
    done := make(chan T)
    defer close(done)

    for _, c := range cs {
        go func(c <-chan T) {
            trySend(done, <-c)
        }(c)
    }

    return <-done
}
```

E se volessimo una funzione `race` per channel tutti di tipi diversi? Possiamo risolvere questo problema ad esempio introducendo un'interfaccia `Awaiter` ed un tipo `awaiterChan` che ci permette di metterci in attesa su channel per tipi qualsiasi

```go
type Awaiter interface {
    Await()
}

type awaiterChan[T any] <-chan T

func (ac awaiterChan[T]) Await() { <-ac }
```

Spesso però ci interessa anche il risultato ricevuto dal channel quindi introduciamo anche il seguente tipo che salva il risultato dentro un puntatore fornito dall'esterno

```go
type targetChan[T any] struct {
    c      <-chan T
    target *T
}

func (tc targetChan[T]) Await() { *tc.target = <-tc.c }
```

a questo punto possiamo definire la funzione `race` "generica" per interfacce in quest'altro modo

```go
func race(rs ...Awaiter) {
    done := make(chan struct{})
    defer close(done)

    for _, r := range rs {
        go func(r Awaiter) {
            r.Await()
            trySend(done, struct{}{})
        }(r)
    }

    <-done
}
```

da utilizzare ad esempio così

```go
var result2 int
var result3 float64

raceAny(
    awaiterChan[string](c1),
    targetChan[int]{c2, &result2},
    targetChan[float64]{c3, &result3},
)

fmt.Println(result2, result3)
```

ed in realtà facendo un po' di pulizzia ed introducendo un paio di funzioni potremmo ottenere un'API molto simpatica come

```go
var result2 int
var result3 float64

channels.Race(
    channels.Awaiter(c1),
    channels.Awaiter(c2, channels.WithTarget(&result2)),
    channels.Awaiter(c3, channels.WithTarget(&result3)),
)

fmt.Println(result2, result3)
```

## 1 + 1 = 2

Ora vediamo un esempio spastico solo per vedere la potenza che possono raggiunre le _generics_ in Go.

In questi esempi ci interesserà giusto che il programma compili quindi spesso per evitare di definire il corpo di alcune funzioni useremo dei `panic`.

### Premesse

Definiamo i possibili "tipi" delle nostre espressioni

```go
type Bool interface{ isBool() }

type Nat interface{ isNat() }

type Nat2Nat interface{ isNat2Nat() }
```

Inoltre introduciamo il seguente tipo `V` di _valutazione_ che essenzilamente è un trocco per poter codificare _higher-kinded types_ in Go (di base in Go non possiamo scrivere un viconlo del tipo

```go
MapContainerItems[F Functor[_], T, S any](items F[T], f func(T) S) F[S]
```

che ci permetta di mappare contenitori arbitrari)

```go
type V[ H Nat2Nat, T Nat ] Nat
```

### Assiomi dei Naturali

A questo punto possiamo definire i numeri naturali come tipi in questo modo (da ricordare che `type <newtype> <expr>` definisce un nuovo tipo mentre la sintassi `type <name> = <expr>` introduce solo un alias)

```go
type Zero Nat
type Succ Nat2Nat

// Alcuni alias utili
type One = V[Succ, Zero]
type Two = V[Succ, V[Succ, Zero]]
type Three = V[Succ, V[Succ, V[Succ, Zero]]]
```

### Uguaglianza

Ora definiamo un tipo per rappresentare l'uguaglianza tra due termini.

```go
type Eq[A, B any] Bool
```

con rispettivi assiami di riflessività, simmetria e transitività per l'uguaglianza

```go
// Eq_Refl ovvero l'assioma
//   forall x : x = x
func Eq_Reflexive[T any]() Eq[T, T] {
    panic("axiom: comptime only")
}

// Eq_Symmetric ovvero l'assioma
//   forall a, b: a = b => b = a
func Eq_Symmetric[A, B any](_ Eq[A, B]) Eq[B, A] {
    panic("axiom: comptime only")
}

// Eq_Transitive ovvero l'assioma
//   forall a, b, c: a = b e b = c => a = c
func Eq_Transitive[A, B, C any](_ Eq[A, B], _ Eq[B, C]) Eq[A, C] {
    panic("axiom: comptime only")
}
```

### Uguaglianza e Sostituzione

Un altro assioma dell'uguaglianza su cui spesso si sorvola è quello della sostituzione, ovvero se abbiamo due cose uguali ed una mappa allora anche gli elementi mappati sono uguali.

Più precisamente per ogni funzione `F`, ovvero tipo vincolato all'interfaccia `Nat2Nat` vorremmo dire che

```
               F
Eq[ A , B ] ------> Eq[ F[A] , F[B] ]

```

e possiamo codificare questa cosa in Go come segue: data una funzione ed una dimostrazione che due cose sono uguali allora possiamo applicare la funzione ed ottenere altre cose uguali

```go
// Function_Eq ovvero l'assioma
//   forall f function, forall a, b nat: a = b  => f(a) = f(b)
func Function_Eq[F Nat2Nat, A, B Nat](_ Eq[A, B]) Eq[V[F, A], V[F, B]] {
    panic("axiom: comptime only")
}
```

### Assiomi dell'addizione

Questi sono gli assiomi dell'addizione (giusto quelli che ci servono) secondo Peano

```go
type Plus[L, R Nat] Nat

// "n + 0 = n"

// Plus_Zero ovvero l'assioma
//   forall n, m: n + succ(m) = succ(n + m)
func Plus_Zero[N Nat]() Eq[Plus[N, Zero], N] {
    panic("axiom: comptime only")
}

// "n + (m + 1) = (n + m) + 1"

// Plus_Sum ovvero l'assioma
//   forall n, m: n + succ(m) = succ(n + m)
func Plus_Sum[N, M Nat]() Eq[
    Plus[N, V[Succ, M]],
    V[Succ, Plus[N, M]],
] { panic("axiom: comptime only") }
```

### La dimostrazione finale

Ed ora possiamo concludere con la nostra dimostrazione di `1 + 1 = 2` al livello dei tipi

```go
func Theorem_OnePlusOneEqTwo() Eq[Plus[One, One], Two] {
    // 1 + 0 = 1
    // en1 :: Eq[ Plus[One, Zero], One ]
    en1 := Plus_Zero[One]()

    // (1 + 0) + 1 = 2
    // en2 :: Eq[ V[Succ, Plus[One, Zero]], Two ]
    en2 := Function_Eq[Succ](en1)

    // 1 + 1 = (1 + 0) + 1
    // en3 :: Eq[ Plus[One, One], V[Succ, Plus[One, Zero]] ]
    en3 := Plus_Sum[One, Zero]()

    return Eq_Transitive(en3, en2)
}
```

## Conclusione

### Regole generali

Per scrivere _codice generico_ in Go

-   Se l'implementazione dell'operazione che vogliamo supportare non dipende del tipo usato allora conviene usare dei **type-parameter**

-   Se invece dipende dal tipo usato allora è meglio usare delle **interfacce**

-   Se invece dipende sia dal tipo e deve anche funzionare per tipi che non supportano metodi (ad esempio per i tipi primitivi) allora conviene usare **reflection**

### Domande dal pubblico

Alla fine alcune persone hanno fatto delle domande

-   Uno ha chiesto la cosa citata sopra su quale fosse la differenza tra `type <newtype> <expr>` e `type <name> = <expr>`.

-   Un'altra domanda interessante è stata sul se anche con le generics in Go ci fosse la possibilità di vincolare la _varianza_ o la _covarianza_ delle generics come in altri linguaggi come in Java e Kotlin. La risposta è che in Go non c'è l'ereditarietà quindi non c'è un modo di confrontare tipi rispetto ad una qualche "torre" di tipi. Quindi di base tutte le funzioni generiche in Go sono "invarianti".

-   Qualcuno ha anche chiesto come fosse migrare codice da senza a con _generics_... Ehm, in realtà per il momento noi al **PHC** non abbiamo veramente fatto progetti molto grossi al punto da dover migrare codice, cioè in realtà facciamo molti progetti piccolini al volo più che lavorare ad un singolo progetto grosso. Quindi la risposta è tipo _boh_.

-   Poi c'era anche qualcuno scettico sulle generics che complicano solo il linguaggio, però quasi tutti i linguaggi recenti hanno una qualche forma di _generics_ proprio perché evidentemente è della complessità necessaria per scrivere codice più sicuro e spesso per ripetersi meno e fare meno errori.

---

## Bibliografia

Tutta la prima parte del talk deriva essenzialmente da questi articoli.

-   <https://go.dev/blog/intro-generics>

    Si ringrazia principalmente per i tre diagrammini sui _type sets_ molto simpatici.

-   <https://go.dev/blog/when-generics>

    Articolo che parla di quando conviene e non conviene utilizzare le generics.

-   <https://github.com/golang/proposal/blob/master/design/generics-implementation-dictionaries-go1.18.md>

    Per l'implementazione delle generics con _GCShapes_ e dizionari
