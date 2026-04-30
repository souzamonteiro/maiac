#include <stdio.h>
#include <string.h>

int main(void) {
    int i;
    char name[255];
    int count;

    printf("Enter your name: ");
    scanf("%254s", name);
    printf("\n");

    count = 0;

    for (i = 0; i < (int)strlen(name); i++) {
        if ((name[i] == 'a') || (name[i] == 'e') || (name[i] == 'i') || (name[i] == 'o') || (name[i] == 'u')) {
            count++;
        }
    }

    printf("Your name contains %d vowels.\n", count);

    return 0;
}
