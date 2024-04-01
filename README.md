> Disclaimer: This project is at a very early stage, many things may not work.

Overview
===
term-lisp is a language for *term* *lis*t *p*rocessing with first-class pattern matching, inspired by Pie, Haskel, Agda et al.

Term rewriting
---
Right from when Church and Turing defined it, the concept of computation has been two-fold --- it can be presented either as the process of mutating the values of some state (Turing Machine) or by transforming some terms, using a predefined set of equations (Lambda Calculus). term-lisp leans heavily in the second direction. It does not support variables and its functions, are *rules* that describe how to replace a given term with another one. 

For example, consider how the booleans are defined:

```
(true = Bool True)
(false = Bool False)
```
This means "when you see the term "true", replace it with the term "Bool True"

Also, note that "Bool True" isn't defined anywhere. That is because in term-lisp, unlike in other lisps, an undefined term is not an error, it is just an undefined term.

First-class pattern matching
---
term-lisp supports first-class pattern matching. This means that you can have functions that return patterns. 

For example, consider how the if expression is defined:

```
(if (:literal true) a b = a)
(if (:literal false) a b = b)
```
Here the terms true and false are automatically expanded, so the expressions above are a shorthand for:

```
(if (:literal (Bool True)) a b = a)
(if (:literal (Bool False)) a b = b)
```
Lazy evaluation
---
Term-rewriting languages sometimes have issues with dealing with functions that perform side-effects, such as `print`, as they don't allow for so fine-grained control over when is the function evaluated. To prevent unwanted execution, expressions in term-lisp are evaluated lazily i.e. only when they are needed.

For example, consider this function that prints an error when its arguments are not equal:

```
(assertEqual a b = (if (eq a b) () (print (error a is-not-equal-to b))))
```

If you wish to define `if` as a function in a non-lazy (strict) language, the `print` function will be called no matter if the two expressions are equal, simply because the result would be evaluated before the `if` function is even called. 

Language tutorial
==
Let's start with BNR form:
```
<expression> ::= <atom> | <constructor> | <application> | <definition>
atom ::= <char> | <atom> <char>
datatype ::= "(" <atom> <expression>* ")"
application ::= "(" <atom> <expression>* ")"
definition ::= "("<atom> <datatype> "=" <expression> ")"
chain ::= "(" <expression>* ")"
```
Like every other Lisp, term-lisp is based on atoms and lists. Atoms are the primitive values, lists contain them e.g. `foo`, `bar` `3` `+` are atoms, `(foo bar 3)` is a list.


Regular Lisps are based on the pair/tuple datatype, the `cons` data constructor, which unites two values in a tuple, and the `car` and `cdr` destructors which retrieve the first and second value of a tuple, respectively. 

```
(assertEqual (car (cons foo bar)) foo)
(assertEqual (cdr (cons foo bar)) bar)
```

In term-lisp, the pair is just one of the datatypes that you can define and use.

```
(cons a b = Pair a b)
(car (Pair a b) = a)
(cdr (Pair a b) = b)
```
We will review how this is done.

Functional application
---
Functional application in term-lisp works as in any other Lisp. A list of the type `(function-name argument1 argument2)` evaluates to the function's return expression e.g. `(car (cons foo bar))` evaluates to `foo`.

Datatype
---
What happens if we construct an expression that looks like function application, but the function being applied is not defined? In most languages, this would result in error, but in term-lisp we will create a new datatype/constructor, e.g. the expression `Pair foo bar` would evaluate to... `Pair foo bar` i.e. we will save a new object of type `Pair`,  containing the values of `foo` and `bar`. What if the functions `foo` and `bar` aren't defined as well? They would evaluate to themselves too, like constructors without arguments. `True` and `False` are constructors without arguments as well.

Function definition
---
A functional definition is a list of arguments and an expression that does something with these arguments, separated by an equals sign.

For example, here is a function that accepts two arguments and returns a new datatype that unites them into one:

```
(cons a b = Pair a b)
```
Functional definitions support a variety of pattern-matching features.

Functional definitions support *destructuring* arguments. For example, the function

```
(car (Pair a b) = a)
```
accepts one argument which has to be a `Pair` datatype and destructures it to its two elements (which can be referred to by the names `a` and `b` in the resulting expression.

The destructuring can also be used for type-checking. Consider the following function for printing:

```
(print-pair (Pair a b) = print (Pair a b))
```

The resulting function will behave like `print`, but it will only work with arguments of type `Pair`. 

Functional definitions support *value-matching*, via the `:literal`. For example, consider the implementation of the function `if`:

```
(if (:literal true) a b = a)
```

This means that the function will only work if the first argument is `true` (this is different from `(if true a b = a)` which will assign the symbol `true` to the value of the first parameter).

Functional definitions also support *multiple implementations* of the same function, like for example the implementation of `if` would be incomplete, as it will fail when the value is `false`. Adding a second implementation makes it total (provided that someone does not define more Bool values).

```
(if (:literal false) a b = b)
```

Functional definitions support *passing functions*, via the `:lambda` keyword:

``` 
(map a (:lambda fun) = fun a)
```

You can pass an existing function:

```
(this-is a = (this is a))
(assertEqual (map foo this-is) (this is foo))
```
Or define one inline (be sure to give it a name):
```
(assertEqual (map bar (fun a = (this is a))) (this is bar))
```

Running term-lisp
---
In the project root, run:

```
node termlisp.js <file>
```
It will evaluate the prelude module, plus your file (if you provided one) and go to REPL mode.

Read [the prelude](/prelude.tls).
