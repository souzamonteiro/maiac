#define EXIT_FAILURE 1
#define EXIT_SUCCESS 0
#define MB_CUR_MAX 1
#define NULL ((void*)0)
#define RAND_MAX 32767

typedef struct { int quot; int rem; } div_t;
typedef struct { long quot; long rem; } ldiv_t;
typedef unsigned int size_t;
typedef int wchar_t;

extern size_t __builtin_wasm_memory_grow(size_t memory_index, size_t pages);
extern size_t __builtin_wasm_memory_size(size_t memory_index);

extern void _exit_js(int status);
extern void _abort_js(void);
extern int _system_js(const char *command);
extern char *_getenv_js(const char *name);

typedef struct Header {
    size_t size;
    int free;
    Header *next;
} Header;

#define HEAP_SIZE (1024 * 1024)
#define WASM_PAGE_SIZE 65536UL
#define ATEXIT_MAX 32

static char static_heap[HEAP_SIZE];
static Header *heap_list = NULL;
static char *program_break = NULL;
static Header *find_free_prev = NULL;

static void (*atexit_handlers[ATEXIT_MAX])(void);
static int atexit_count = 0;

static unsigned long next_rand = 1;

static size_t align_size(size_t size) {
    return (size + 7) & ~((size_t)7);
}

static int is_space_char(int ch) {
    return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\f' || ch == '\v';
}

static int digit_value(int ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'a' && ch <= 'z') return 10 + (ch - 'a');
    if (ch >= 'A' && ch <= 'Z') return 10 + (ch - 'A');
    return -1;
}

static void init_heap(void) {
    Header *block;
    if (heap_list != NULL) {
        return;
    }

    block = (Header *)static_heap;
    block->size = HEAP_SIZE - sizeof(Header);
    block->free = 1;
    block->next = NULL;

    heap_list = block;
    program_break = static_heap + HEAP_SIZE;
}

static void *sbrk_local(size_t increment) {
    size_t aligned_inc;
    unsigned long current_break;
    unsigned long needed_break;
    size_t memory_pages;
    unsigned long memory_limit;
    size_t extra_bytes;
    size_t pages_needed;
    char *old_break;

    if (program_break == NULL) {
        init_heap();
    }

    aligned_inc = align_size(increment);
    current_break = (unsigned long)program_break;
    needed_break = current_break + (unsigned long)aligned_inc;

    memory_pages = __builtin_wasm_memory_size(0);
    memory_limit = (unsigned long)(memory_pages * WASM_PAGE_SIZE);

    if (needed_break > memory_limit) {
        extra_bytes = (size_t)(needed_break - memory_limit);
        pages_needed = (extra_bytes + WASM_PAGE_SIZE - 1) / WASM_PAGE_SIZE;
        if (__builtin_wasm_memory_grow(0, pages_needed) == (size_t)-1) {
            return NULL;
        }
    }

    old_break = program_break;
    program_break += aligned_inc;
    return (void *)old_break;
}

static Header *find_free_block(size_t size) {
    Header *current;
    current = heap_list;
    find_free_prev = NULL;

    while (current != NULL) {
        if (current->free && current->size >= size) {
            return current;
        }
        find_free_prev = current;
        current = current->next;
    }

    return NULL;
}

static void split_block(Header *block, size_t size) {
    Header *new_block;
    size_t remain;

    if (block == NULL) return;
    if (block->size <= size + sizeof(Header) + 8) return;

    remain = block->size - size - sizeof(Header);
    new_block = (Header *)((char *)(block + 1) + size);
    new_block->size = remain;
    new_block->free = 1;
    new_block->next = block->next;

    block->size = size;
    block->next = new_block;
}

static void coalesce_blocks(void) {
    Header *current;
    current = heap_list;

    while (current != NULL && current->next != NULL) {
        char *end_of_current;
        end_of_current = (char *)(current + 1) + current->size;

        if (current->free && current->next->free && end_of_current == (char *)current->next) {
            current->size += sizeof(Header) + current->next->size;
            current->next = current->next->next;
            continue;
        }

        current = current->next;
    }
}

void *malloc(size_t size) {
    Header *block;
    Header *last;

    if (size == 0) {
        return NULL;
    }

    if (heap_list == NULL) {
        init_heap();
    }

    size = align_size(size);
    block = find_free_block(size);
    last = find_free_prev;
    if (block == NULL) {
        void *raw;
        raw = sbrk_local(sizeof(Header) + size);
        if (raw == NULL) {
            return NULL;
        }

        block = (Header *)raw;
        block->size = size;
        block->free = 0;
        block->next = NULL;

        if (last != NULL) {
            last->next = block;
        } else {
            heap_list = block;
        }

        return (void *)(block + 1);
    }

    split_block(block, size);
    block->free = 0;
    return (void *)(block + 1);
}

void free(void *ptr) {
    Header *block;

    if (ptr == NULL) {
        return;
    }

    block = (Header *)ptr - 1;
    block->free = 1;
    coalesce_blocks();
}

void *calloc(size_t nmemb, size_t size) {
    size_t total;
    char *bytes;
    void *ptr;
    size_t i;

    if (nmemb == 0 || size == 0) {
        return NULL;
    }

    total = nmemb * size;
    if (total / nmemb != size) {
        return NULL;
    }

    ptr = malloc(total);
    if (ptr == NULL) {
        return NULL;
    }

    bytes = (char *)ptr;
    for (i = 0; i < total; i++) {
        bytes[i] = 0;
    }

    return ptr;
}

void *realloc(void *ptr, size_t size) {
    Header *block;
    size_t copy_size;
    void *new_ptr;
    char *src;
    char *dst;
    size_t i;

    if (ptr == NULL) {
        return malloc(size);
    }
    if (size == 0) {
        free(ptr);
        return NULL;
    }

    size = align_size(size);
    block = (Header *)ptr - 1;

    if (block->size >= size) {
        split_block(block, size);
        return ptr;
    }

    if (block->next != NULL && block->next->free) {
        char *end_of_block;
        end_of_block = (char *)(block + 1) + block->size;
        if (end_of_block == (char *)block->next) {
            size_t combined;
            combined = block->size + sizeof(Header) + block->next->size;
            if (combined >= size) {
                block->size = combined;
                block->next = block->next->next;
                split_block(block, size);
                return ptr;
            }
        }
    }

    new_ptr = malloc(size);
    if (new_ptr == NULL) {
        return NULL;
    }

    copy_size = block->size;
    if (copy_size > size) copy_size = size;

    src = (char *)ptr;
    dst = (char *)new_ptr;
    for (i = 0; i < copy_size; i++) {
        dst[i] = src[i];
    }

    free(ptr);
    return new_ptr;
}

int rand(void) {
    next_rand = next_rand * 1103515245UL + 12345UL;
    return (int)((next_rand / 65536UL) % 32768UL);
}

void srand(unsigned int seed) {
    next_rand = (unsigned long)seed;
}

unsigned long int strtoul(const char *nptr, char *endptr[], int base) {
    const char *p;
    int negative;
    unsigned long value;
    int any;

    p = nptr;
    while (is_space_char((unsigned char)*p)) p++;

    negative = 0;
    if (*p == '+' || *p == '-') {
        negative = (*p == '-');
        p++;
    }

    if (base == 0) {
        if (p[0] == '0' && (p[1] == 'x' || p[1] == 'X')) {
            base = 16;
            p += 2;
        } else if (p[0] == '0') {
            base = 8;
            p += 1;
        } else {
            base = 10;
        }
    } else if (base == 16 && p[0] == '0' && (p[1] == 'x' || p[1] == 'X')) {
        p += 2;
    }

    value = 0;
    any = 0;
    while (*p != '\0') {
        int d;
        d = digit_value((unsigned char)*p);
        if (d < 0 || d >= base) break;
        value = value * (unsigned long)base + (unsigned long)d;
        p++;
        any = 1;
    }

    if (endptr != NULL) {
        endptr[0] = (char *)(any ? p : nptr);
    }

    if (negative) {
        return (unsigned long)(-(long)value);
    }

    return value;
}

long int strtol(const char *nptr, char *endptr[], int base) {
    const char *p;
    int negative;
    unsigned long value;
    char *local_end;

    p = nptr;
    while (is_space_char((unsigned char)*p)) p++;

    negative = 0;
    if (*p == '+' || *p == '-') {
        negative = (*p == '-');
        p++;
    }

    value = strtoul(p, &local_end, base);

    if (endptr != NULL) {
        if (local_end == p) {
            endptr[0] = (char *)nptr;
        } else {
            endptr[0] = local_end;
        }
    }

    if (negative) {
        return -(long int)value;
    }
    return (long int)value;
}

double strtod(const char *nptr, char *endptr[]) {
    const char *p;
    int sign;
    double value;
    int any;
    int exp_sign;
    int exp_value;

    p = nptr;
    while (is_space_char((unsigned char)*p)) p++;

    sign = 1;
    if (*p == '+' || *p == '-') {
        if (*p == '-') sign = -1;
        p++;
    }

    value = 0.0;
    any = 0;

    while (*p >= '0' && *p <= '9') {
        value = value * 10.0 + (double)(*p - '0');
        p++;
        any = 1;
    }

    if (*p == '.') {
        double frac;
        p++;
        frac = 0.1;
        while (*p >= '0' && *p <= '9') {
            value += (double)(*p - '0') * frac;
            frac *= 0.1;
            p++;
            any = 1;
        }
    }

    if ((*p == 'e' || *p == 'E') && any) {
        const char *exp_start;
        exp_start = p;
        p++;
        exp_sign = 1;
        if (*p == '+' || *p == '-') {
            if (*p == '-') exp_sign = -1;
            p++;
        }

        exp_value = 0;
        if (*p < '0' || *p > '9') {
            p = exp_start;
        } else {
            while (*p >= '0' && *p <= '9') {
                exp_value = exp_value * 10 + (*p - '0');
                p++;
            }

            while (exp_value > 0) {
                if (exp_sign > 0) value *= 10.0;
                else value *= 0.1;
                exp_value--;
            }
        }
    }

    if (endptr != NULL) {
        endptr[0] = (char *)(any ? p : nptr);
    }

    return sign < 0 ? -value : value;
}

double atof(const char *nptr) {
    return strtod(nptr, NULL);
}

int atoi(const char *nptr) {
    return (int)strtol(nptr, NULL, 10);
}

long int atol(const char *nptr) {
    return strtol(nptr, NULL, 10);
}

int atexit(void (*func)(void)) {
    if (func == NULL) return 1;
    if (atexit_count >= ATEXIT_MAX) return 1;
    atexit_handlers[atexit_count++] = func;
    return 0;
}

void exit(int status) {
    int i;
    for (i = atexit_count - 1; i >= 0; i--) {
        if (atexit_handlers[i] != NULL) {
            atexit_handlers[i]();
        }
    }

    _exit_js(status);
    for (;;) {
    }
}

void abort(void) {
    _abort_js();
    for (;;) {
    }
}

char *getenv(const char *name) {
    if (name == NULL) return NULL;
    return _getenv_js(name);
}

int system(const char *string) {
    if (string == NULL) return 0;
    return _system_js(string);
}

static void swap_bytes(char *a, char *b, size_t size) {
    char tmp;
    while (size > 0) {
        tmp = *a;
        *a = *b;
        *b = tmp;
        a++;
        b++;
        size--;
    }
}

void qsort(void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *)) {
    char *array;
    char *pivot;
    size_t i;
    size_t j;

    if (base == NULL || compar == NULL || size == 0 || nmemb <= 1) return;

    array = (char *)base;
    pivot = array + (nmemb - 1) * size;

    i = 0;
    for (j = 0; j < nmemb - 1; j++) {
        if (compar(array + j * size, pivot) <= 0) {
            if (i != j) {
                swap_bytes(array + i * size, array + j * size, size);
            }
            i++;
        }
    }

    if (i != nmemb - 1) {
        swap_bytes(array + i * size, pivot, size);
    }

    qsort(array, i, size, compar);
    qsort(array + (i + 1) * size, nmemb - i - 1, size, compar);
}

void *bsearch(const void *key, const void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *)) {
    size_t left;
    size_t right;
    const char *array;

    if (key == NULL || base == NULL || compar == NULL || size == 0) return NULL;

    left = 0;
    right = nmemb;
    array = (const char *)base;

    while (left < right) {
        size_t mid;
        int cmp;
        mid = left + (right - left) / 2;
        cmp = compar(key, array + mid * size);

        if (cmp < 0) {
            right = mid;
        } else if (cmp > 0) {
            left = mid + 1;
        } else {
            return (void *)(array + mid * size);
        }
    }

    return NULL;
}

int abs(int j) {
    return j < 0 ? -j : j;
}

long int labs(long int j) {
    return j < 0 ? -j : j;
}

div_t div(int numer, int denom) {
    div_t r;
    if (denom == 0) {
        r.quot = 0;
        r.rem = numer;
        return r;
    }
    r.quot = numer / denom;
    r.rem = numer % denom;
    return r;
}

ldiv_t ldiv(long int numer, long int denom) {
    ldiv_t r;
    if (denom == 0) {
        r.quot = 0;
        r.rem = numer;
        return r;
    }
    r.quot = numer / denom;
    r.rem = numer % denom;
    return r;
}

int mblen(const char *s, size_t n) {
    unsigned char c;

    if (s == NULL) return 0;
    if (n == 0) return -1;

    c = (unsigned char)s[0];
    if (c == 0) return 0;
    if ((c & 0x80) == 0) return 1;
    if ((c & 0xE0) == 0xC0) return n >= 2 ? 2 : -1;
    if ((c & 0xF0) == 0xE0) return n >= 3 ? 3 : -1;
    if ((c & 0xF8) == 0xF0) return n >= 4 ? 4 : -1;
    return -1;
}

int mbtowc(wchar_t *pwc, const char *s, size_t n) {
    int len;
    if (s == NULL) return 0;
    len = mblen(s, n);
    if (len <= 0) return len;
    if (pwc != NULL) {
        *pwc = (unsigned char)s[0];
    }
    return len;
}

int wctomb(char *s, wchar_t wchar) {
    if (s == NULL) return 0;
    if ((unsigned int)wchar > 0xFFU) return -1;
    s[0] = (char)wchar;
    return 1;
}

size_t mbstowcs(wchar_t *pwc, const char *s, size_t n) {
    size_t count;
    if (s == NULL) return 0;

    count = 0;
    while (count < n && s[count] != '\0') {
        if (pwc != NULL) {
            pwc[count] = (unsigned char)s[count];
        }
        count++;
    }
    return count;
}

size_t wcstombs(char *s, const wchar_t *pwc, size_t n) {
    size_t count;
    if (pwc == NULL) return 0;

    count = 0;
    while (count < n && pwc[count] != 0) {
        if ((unsigned int)pwc[count] > 0xFFU) {
            return (size_t)-1;
        }
        if (s != NULL) {
            s[count] = (char)pwc[count];
        }
        count++;
    }
    return count;
}