#include <stdio.h>

int main(void) {
    int fp;
    long totalSize;

    fp = fopen("session.log", "a+");
    if (fp == 0) {
        printf("failed to open session.log\n");
        return 1;
    }

    fwrite("run\n", 1, 4, fp);
    fflush(fp);

    fseek(fp, 0, 2);
    totalSize = ftell(fp);

    fclose(fp);

    printf("session.log size now: %d bytes\n", (int)totalSize);
    return 0;
}
