'use strict';

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function parseFormatSpec(format, startIndex) {
  let i = startIndex;
  const len = format.length;

  const spec = {
    end: startIndex,
    flags: '',
    width: null,
    widthFromArg: false,
    precision: null,
    precisionFromArg: false,
    length: '',
    type: ''
  };

  while (i < len && "+- 0#'".indexOf(format[i]) !== -1) {
    spec.flags += format[i++];
  }

  if (i < len && format[i] === '*') {
    spec.widthFromArg = true;
    i++;
  } else {
    let w = '';
    while (i < len && isDigit(format[i])) {
      w += format[i++];
    }
    if (w) spec.width = parseInt(w, 10);
  }

  if (i < len && format[i] === '.') {
    i++;
    if (i < len && format[i] === '*') {
      spec.precisionFromArg = true;
      i++;
    } else {
      let p = '';
      while (i < len && isDigit(format[i])) {
        p += format[i++];
      }
      spec.precision = p ? parseInt(p, 10) : 0;
    }
  }

  if (i < len) {
    if ((format[i] === 'h' || format[i] === 'l') && format[i + 1] === format[i]) {
      spec.length = format[i] + format[i + 1];
      i += 2;
    } else if ('hlL'.indexOf(format[i]) !== -1) {
      spec.length = format[i];
      i += 1;
    }
  }

  if (i < len) {
    spec.type = format[i];
    spec.end = i;
  }

  return spec;
}

function padSigned(text, sign, width, leftAlign, zeroPad) {
  const body = sign + text;
  if (width == null || width <= body.length) return body;

  const padCount = width - body.length;
  if (leftAlign) return body + ' '.repeat(padCount);
  if (zeroPad && sign) return sign + text.padStart(width - sign.length, '0');
  if (zeroPad) return body.padStart(width, '0');
  return body.padStart(width, ' ');
}

function applyWidth(text, width, leftAlign, zeroPad) {
  if (width == null || width <= text.length) return text;
  const padCount = width - text.length;
  if (leftAlign) return text + ' '.repeat(padCount);
  if (zeroPad) return text.padStart(width, '0');
  return text.padStart(width, ' ');
}

function stripTrailingZerosForG(text) {
  if (text.indexOf('e') !== -1 || text.indexOf('E') !== -1) {
    return text.replace(/(\.[0-9]*?)0+(e[+-]?[0-9]+)$/i, '$1$2').replace(/\.e/i, 'e');
  }
  return text.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '');
}

function sprintf(format, args) {
  let out = '';
  let i = 0;
  let argIndex = 0;
  const fmt = String(format || '');

  while (i < fmt.length) {
    if (fmt[i] !== '%') {
      out += fmt[i++];
      continue;
    }

    if (fmt[i + 1] === '%') {
      out += '%';
      i += 2;
      continue;
    }

    const spec = parseFormatSpec(fmt, i + 1);
    if (!spec.type) {
      out += fmt[i++];
      continue;
    }

    i = spec.end + 1;

    let width = spec.width;
    let precision = spec.precision;

    if (spec.widthFromArg) {
      width = Number(args[argIndex++] || 0);
      if (width < 0) {
        spec.flags += '-';
        width = -width;
      }
    }

    if (spec.precisionFromArg) {
      precision = Number(args[argIndex++] || 0);
      if (precision < 0) precision = null;
    }

    const leftAlign = spec.flags.indexOf('-') !== -1;
    const forceSign = spec.flags.indexOf('+') !== -1;
    const spaceSign = spec.flags.indexOf(' ') !== -1;
    const zeroPad = spec.flags.indexOf('0') !== -1 && !leftAlign;
    const alternate = spec.flags.indexOf('#') !== -1;

    const type = spec.type;
    const value = args[argIndex++];

    if (type === 's') {
      let text = value == null ? '(null)' : String(value);
      if (precision != null) text = text.slice(0, precision);
      out += applyWidth(text, width, leftAlign, false);
      continue;
    }

    if (type === 'c') {
      const text = String.fromCharCode((Number(value) | 0) & 0xFF);
      out += applyWidth(text, width, leftAlign, false);
      continue;
    }

    if (type === 'd' || type === 'i') {
      const n = Number(value) | 0;
      let sign = '';
      let text = String(Math.abs(n));
      if (n < 0) sign = '-';
      else if (forceSign) sign = '+';
      else if (spaceSign) sign = ' ';
      if (precision != null) text = text.padStart(precision, '0');
      out += padSigned(text, sign, width, leftAlign, zeroPad && precision == null);
      continue;
    }

    if (type === 'u' || type === 'o' || type === 'x' || type === 'X' || type === 'p') {
      const n = Number(value) >>> 0;
      let text = '';
      let prefix = '';

      if (type === 'u') text = n.toString(10);
      else if (type === 'o') text = n.toString(8);
      else if (type === 'X') text = n.toString(16).toUpperCase();
      else text = n.toString(16);

      if (precision != null) text = text.padStart(precision, '0');

      if (type === 'p') {
        prefix = '0x';
      } else if (alternate && n !== 0) {
        if (type === 'o' && text[0] !== '0') prefix = '0';
        if (type === 'x') prefix = '0x';
        if (type === 'X') prefix = '0X';
      }

      if (width != null && width > (prefix.length + text.length)) {
        const padChar = (zeroPad && precision == null) ? '0' : ' ';
        const padLen = width - (prefix.length + text.length);
        if (leftAlign) {
          out += prefix + text + ' '.repeat(padLen);
        } else if (padChar === '0') {
          out += prefix + text.padStart(text.length + padLen, '0');
        } else {
          out += ' '.repeat(padLen) + prefix + text;
        }
      } else {
        out += prefix + text;
      }
      continue;
    }

    if ('fFeEgG'.indexOf(type) !== -1) {
      let n = Number(value);
      if (!Number.isFinite(n)) {
        out += String(n);
        continue;
      }

      let sign = '';
      if (n < 0) {
        sign = '-';
        n = -n;
      } else if (forceSign) {
        sign = '+';
      } else if (spaceSign) {
        sign = ' ';
      }

      const p = precision != null ? precision : 6;
      let text;

      if (type === 'f' || type === 'F') {
        text = n.toFixed(p);
      } else if (type === 'e' || type === 'E') {
        text = n.toExponential(p);
      } else {
        const eff = p === 0 ? 1 : p;
        text = n.toPrecision(eff);
        if (!alternate) text = stripTrailingZerosForG(text);
      }

      if (type === 'E' || type === 'G' || type === 'F') {
        text = text.toUpperCase();
      }

      out += padSigned(text, sign, width, leftAlign, zeroPad);
      continue;
    }

    out += '%' + spec.type;
  }

  return out;
}

module.exports = { sprintf, parseFormatSpec };
