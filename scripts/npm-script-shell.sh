#!/bin/sh

# Preserve caller overrides while giving node-gyp a C++20 default.
export CXXFLAGS="${CXXFLAGS:--std=c++20}"
exec /bin/sh "$@"
