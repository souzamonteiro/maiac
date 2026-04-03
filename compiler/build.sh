#!/bin/sh

java ../tools/REx -backtrack -javascript -tree -main grammar/C.ebnf
mv -f C.js C-main.js
java ../tools/REx -backtrack -javascript -tree grammar/C.ebnf
java -jar ../tools/rr.war grammar/C.ebnf > C.xhtml