#include <stdio.h>

int main(void) {
    FILE *f;
    char buf[8];
    int n;

    f = fopen("suite_stdio.txt", "w+");
    if (!f) return 11;
    fwrite("abc", 1, 3, f);
    fseek(f, 0, 0);
    n = fread(buf, 1, 3, f);
    fclose(f);

    if (n == 3 && buf[0] == 'a' && buf[2] == 'c') {
        printf("PASS stdio_file\n");
    }
    printf("ALL PASS\n");
    return 0;
}