#include <stdio.h>

int main(void) {
    int i;
    char c;

    i = 0;
    while (i < 10) {               /* A while statement executes a block of code */
        printf("%d\n", i);         /* while a condition is evaluated as true. */
        i++;                       /* The variable i is called an iterator. */
    }

    do {                           /* A do statement executes a block of code */
        printf("%d\n", i);         /* while a condition is evaluated as true, */
        i++;                       /* but checks the condition AFTER the block */
    } while (i < 10);              /* of code has been executed (at least once). */

    for (i = 0; i < 10; i++) {     /* A for statement combines initialization, */
        printf("%d\n", i);         /* condition check and iterator increment */
    }                              /* in a single command. */

    for (c = 'a'; c < 'z'; c++) {  /* We can use char variables as iterators */
        printf("%c\n", c);         /* since they are stored as integers internally. */
    }

    return 0;
}
