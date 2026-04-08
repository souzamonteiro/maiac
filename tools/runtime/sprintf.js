'use strict';

/**
 * sprintf / vsprintf for the MaiaC WASM runtime host.
 *
 * Handles the C format specifiers relevant to the host printf import:
 *   %d %i  – signed integer
 *   %u     – unsigned integer
 *   %f %e %g – floating-point (values arrive as i32 bit-patterns from WASM)
 *   %s     – string (pointer resolved by the caller before arriving here)
 *   %c     – character code → char
 *   %x %X  – hex (unsigned)
 *   %o     – octal (unsigned)
 *   %p     – pointer (treated as %x)
 *   %lu %ld %li %lx %lX – long variants (treated as their unsigned/signed i32 counterparts)
 *   %%     – literal %
 *
 * Width, precision and flags (+, -, 0, space) are supported.
 */

// Regex for a single printf placeholder:
//   %[flags][width][.precision][length]type
const PLACEHOLDER_RE = /%%|%([+\-0 #']*)(\*|\d+)?(?:\.(\*|\d+))?([lh])?([diouxXeEfgGscptu%])/g;

/**
 * Format a string using printf conversion specifiers.
 * @param {string} fmt   - The format string.
 * @param {Array}  args  - Positional argument values (already resolved for %s).
 * @returns {string}
 */
function sprintf(fmt, args) {
  let cursor = 0;

  return String(fmt).replace(PLACEHOLDER_RE, (full, flags, widthSpec, precSpec, _length, type) => {
    if (full === '%%') {
      return '%';
    }

    const value = args[cursor++];

    const f = String(flags || '');
    const leftAlign  = f.includes('-');
    const forceSign  = f.includes('+');
    const zeroPad    = f.includes('0') && !leftAlign;
    const spaceSign  = f.includes(' ');

    const width = widthSpec != null ? parseInt(widthSpec, 10) : 0;
    const prec  = precSpec  != null ? parseInt(precSpec,  10) : null;

    let text = '';
    let sign = '';

    switch (type) {
      case 'd':
      case 'i': {
        const n = value | 0;
        sign = n < 0 ? '-' : (forceSign ? '+' : (spaceSign ? ' ' : ''));
        text = String(Math.abs(n));
        if (prec != null) {
          text = text.padStart(prec, '0');
        }
        break;
      }
      case 'u':
      case 't': {
        const n = value >>> 0;
        text = String(n);
        if (prec != null) {
          text = text.padStart(prec, '0');
        }
        break;
      }
      case 'o': {
        const n = value >>> 0;
        text = n.toString(8);
        if (prec != null) {
          text = text.padStart(prec, '0');
        }
        break;
      }
      case 'x': {
        const n = value >>> 0;
        text = n.toString(16);
        if (prec != null) {
          text = text.padStart(prec, '0');
        }
        break;
      }
      case 'X': {
        const n = value >>> 0;
        text = n.toString(16).toUpperCase();
        if (prec != null) {
          text = text.padStart(prec, '0');
        }
        break;
      }
      case 'p': {
        text = '0x' + (value >>> 0).toString(16);
        break;
      }
      case 'f':
      case 'e':
      case 'E':
      case 'g':
      case 'G': {
        // WASM i32 values arrive here; treat them as the raw int unless they
        // happen to look like a reasonable float already.
        let n = typeof value === 'number' ? value : Number(value);
        sign = n < 0 ? '-' : (forceSign ? '+' : (spaceSign ? ' ' : ''));
        n = Math.abs(n);
        const p = prec != null ? prec : 6;
        if (type === 'e' || type === 'E') {
          text = n.toExponential(p);
          if (type === 'E') text = text.toUpperCase();
        } else if (type === 'g' || type === 'G') {
          text = n.toPrecision(p === 0 ? 1 : p);
          if (type === 'G') text = text.toUpperCase();
        } else {
          text = n.toFixed(p);
        }
        break;
      }
      case 'c': {
        text = String.fromCharCode((value | 0) & 0xff);
        break;
      }
      case 's': {
        text = value == null ? '(null)' : String(value);
        if (prec != null) {
          text = text.slice(0, prec);
        }
        break;
      }
      default:
        return full;
    }

    const body = sign + text;
    if (width > body.length) {
      const pad = width - body.length;
      if (leftAlign) {
        return body + ' '.repeat(pad);
      }
      if (zeroPad && sign) {
        return sign + text.padStart(width - sign.length, '0');
      }
      if (zeroPad) {
        return body.padStart(width, '0');
      }
      return body.padStart(width);
    }
    return body;
  });
}

module.exports = { sprintf };
