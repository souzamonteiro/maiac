#!/bin/sh

# Build the parser for C using tREx
../maiacc/bin/tREx.sh ../grammar/C.ebnf c-parser.js
