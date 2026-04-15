#define NULL ((void*)0)

typedef unsigned int size_t;

#define HEAP_SIZE (1024 * 1024)

static unsigned char heap_area[HEAP_SIZE];
static unsigned int heap_top = 0;
static unsigned long next_rand = 1;

static int is_space_char(int ch) {
    return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\f' || ch == '\v';
}

void *malloc(size_t size) {
    unsigned int aligned;
    unsigned int ptr;

    if (size == 0) return NULL;

    aligned = (unsigned int)((size + 7U) & ~7U);
    if (heap_top + aligned > HEAP_SIZE) return NULL;

    ptr = heap_top;
    heap_top += aligned;
    return (void *)(heap_area + ptr);
}

void free(void *ptr) {
    (void)ptr;
}

void *calloc(size_t nmemb, size_t size) {
    unsigned int total;
    unsigned char *p;
    unsigned int i;

    if (nmemb == 0 || size == 0) return NULL;
    total = (unsigned int)(nmemb * size);
    if (size != 0 && total / size != nmemb) return NULL;

    p = (unsigned char *)malloc((size_t)total);
    if (p == NULL) return NULL;

    for (i = 0; i < total; i++) p[i] = 0;
    return p;
}

void *realloc(void *ptr, size_t size) {
    unsigned char *oldp;
    unsigned char *newp;
    unsigned int i;

    if (ptr == NULL) return malloc(size);
    if (size == 0) {
        free(ptr);
        return NULL;
    }

    oldp = (unsigned char *)ptr;
    newp = (unsigned char *)malloc(size);
    if (newp == NULL) return NULL;

    for (i = 0; i < (unsigned int)size; i++) {
        newp[i] = oldp[i];
    }

    return newp;
}

int rand(void) {
    next_rand = next_rand * 1103515245UL + 12345UL;
    return (int)((next_rand / 65536UL) % 32768UL);
}

void srand(unsigned int seed) {
    next_rand = (unsigned long)seed;
}

int abs(int j) {
    return j < 0 ? -j : j;
}

long int labs(long int j) {
    return j < 0 ? -j : j;
}

int atoi(const char *nptr) {
    int sign;
    int value;

    while (*nptr && is_space_char((unsigned char)*nptr)) nptr++;
    sign = 1;
    if (*nptr == '+' || *nptr == '-') {
        if (*nptr == '-') sign = -1;
        nptr++;
    }

    value = 0;
    while (*nptr >= '0' && *nptr <= '9') {
        value = value * 10 + (*nptr - '0');
        nptr++;
    }

    return sign * value;
}

long int atol(const char *nptr) {
    long int sign;
    long int value;

    while (*nptr && is_space_char((unsigned char)*nptr)) nptr++;
    sign = 1;
    if (*nptr == '+' || *nptr == '-') {
        if (*nptr == '-') sign = -1;
        nptr++;
    }

    value = 0;
    while (*nptr >= '0' && *nptr <= '9') {
        value = value * 10 + (long int)(*nptr - '0');
        nptr++;
    }

    return sign * value;
}
