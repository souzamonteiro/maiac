#define NULL ((void*)0)

static char *strtok_state = (char *)0;

static int char_in_set(char c, const char *set) {
	while (*set != '\0') {
		if (*set == c) return 1;
		set++;
	}
	return 0;
}

void *memcpy(void *s1, const void *s2, int n) {
	unsigned char *dst;
	const unsigned char *src;
	int i;

	if (s1 == s2 || n == 0) return s1;

	dst = (unsigned char *)s1;
	src = (const unsigned char *)s2;
	for (i = 0; i < n; i++) {
		dst[i] = src[i];
	}
	return s1;
}

void *memmove(void *s1, const void *s2, int n) {
	unsigned char *dst;
	const unsigned char *src;
	int i;

	if (s1 == s2 || n == 0) return s1;

	dst = (unsigned char *)s1;
	src = (const unsigned char *)s2;

	if (dst < src) {
		for (i = 0; i < n; i++) {
			dst[i] = src[i];
		}
	} else {
		for (i = n; i > 0; i--) {
			dst[i - 1] = src[i - 1];
		}
	}

	return s1;
}

char *strcpy(char *s1, const char *s2) {
	int len;
	len = strlen(s2);
	memcpy(s1, s2, len + 1);
	return s1;
}

char *strncpy(char *s1, const char *s2, int n) {
	int copy_len;
	int src_len;

	if (n <= 0) return s1;

	src_len = strlen(s2);
	copy_len = src_len < n ? src_len : n;

	if (copy_len > 0) {
		memcpy(s1, s2, copy_len);
	}
	if (copy_len < n) {
		memset(s1 + copy_len, 0, n - copy_len);
	}

	return s1;
}

char *strcat(char *s1, const char *s2) {
	int len1;
	int len2;

	len1 = strlen(s1);
	len2 = strlen(s2);
	memcpy(s1 + len1, s2, len2 + 1);
	return s1;
}

char *strncat(char *s1, const char *s2, int n) {
	int len1;
	int i;

	len1 = strlen(s1);
	i = 0;
	while (i < n && s2[i] != '\0') {
		i++;
	}

	if (i > 0) {
		memcpy(s1 + len1, s2, i);
	}
	memset(s1 + len1 + i, 0, 1);

	return s1;
}

int memcmp(const void *s1, const void *s2, int n) {
	const unsigned char *a;
	const unsigned char *b;
	int i;

	a = (const unsigned char *)s1;
	b = (const unsigned char *)s2;

	for (i = 0; i < n; i++) {
		if (a[i] != b[i]) {
			return (int)a[i] - (int)b[i];
		}
	}
	return 0;
}

int strcmp(const char *s1, const char *s2) {
	while (*s1 != '\0' && *s1 == *s2) {
		s1++;
		s2++;
	}
	return (int)(unsigned char)*s1 - (int)(unsigned char)*s2;
}

int strcoll(const char *s1, const char *s2) {
	return strcmp(s1, s2);
}

int strncmp(const char *s1, const char *s2, int n) {
	int i;
	for (i = 0; i < n; i++) {
		unsigned char a;
		unsigned char b;
		a = (unsigned char)s1[i];
		b = (unsigned char)s2[i];
		if (a != b) return (int)a - (int)b;
		if (a == '\0') return 0;
	}
	return 0;
}

int strxfrm(char *s1, const char *s2, int n) {
	int len;
	int copy_len;

	len = strlen(s2);
	if (n == 0) return len;

	copy_len = len;
	if (copy_len > n - 1) {
		copy_len = n - 1;
	}

	if (copy_len > 0) {
		memcpy(s1, s2, copy_len);
	}
	memset(s1 + copy_len, 0, 1);

	return len;
}

void *memchr(const void *s, int c, int n) {
	const unsigned char *p;
	unsigned char target;
	int i;

	p = (const unsigned char *)s;
	target = (unsigned char)c;
	for (i = 0; i < n; i++) {
		if (p[i] == target) return (void *)(p + i);
	}
	return NULL;
}

char *strchr(const char *s, int c) {
	char target;
	target = (char)c;
	while (*s != '\0') {
		if (*s == target) return (char *)s;
		s++;
	}
	if (target == '\0') return (char *)s;
	return NULL;
}

int strcspn(const char *s1, const char *s2) {
	int i;
	i = 0;
	while (s1[i] != '\0' && !char_in_set(s1[i], s2)) {
		i++;
	}
	return i;
}

char *strpbrk(const char *s1, const char *s2) {
	while (*s1 != '\0') {
		if (char_in_set(*s1, s2)) return (char *)s1;
		s1++;
	}
	return NULL;
}

char *strrchr(const char *s, int c) {
	const char *last;
	char target;

	target = (char)c;
	last = NULL;
	do {
		if (*s == target) last = s;
	} while (*s++ != '\0');

	return (char *)last;
}

int strspn(const char *s1, const char *s2) {
	int i;
	i = 0;
	while (s1[i] != '\0' && char_in_set(s1[i], s2)) {
		i++;
	}
	return i;
}

char *strstr(const char *s1, const char *s2) {
	const char *hay;
	const char *needle;

	if (*s2 == '\0') return (char *)s1;

	while (*s1 != '\0') {
		hay = s1;
		needle = s2;
		while (*hay != '\0' && *needle != '\0' && *hay == *needle) {
			hay++;
			needle++;
		}
		if (*needle == '\0') return (char *)s1;
		s1++;
	}

	return NULL;
}

char *strtok(char *s1, const char *s2) {
	char *start;

	if (s1 != NULL) {
		strtok_state = s1;
	}

	if (strtok_state == NULL) {
		return NULL;
	}

	while (*strtok_state != '\0' && char_in_set(*strtok_state, s2)) {
		strtok_state++;
	}

	if (*strtok_state == '\0') {
		strtok_state = NULL;
		return NULL;
	}

	start = strtok_state;
	while (*strtok_state != '\0' && !char_in_set(*strtok_state, s2)) {
		strtok_state++;
	}

	if (*strtok_state != '\0') {
		memset(strtok_state, 0, 1);
		strtok_state++;
	} else {
		strtok_state = NULL;
	}

	return start;
}

void *memset(void *s, int c, int n) {
	unsigned char *p;
	unsigned char v;
	int i;

	p = (unsigned char *)s;
	v = (unsigned char)c;
	for (i = 0; i < n; i++) {
		p[i] = v;
	}
	return s;
}

char *strerror(int errnum) {
	static char unknown[] = "Unknown error";
	static char domain[] = "Domain error";
	static char range[] = "Range error";

	if (errnum == 1) return domain;
	if (errnum == 2) return range;
	return unknown;
}

int strlen(const char *s) {
	const char *p;
	p = s;
	while (*p != '\0') p++;
	return (int)(p - s);
}
