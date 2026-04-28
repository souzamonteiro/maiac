#include <stdio.h>
#include <pthread.h>

struct ThreadArg {
    int loops;
    int *shared;
};

void *worker(void *opaque) {
    struct ThreadArg *arg = (struct ThreadArg *)opaque;
    int i;
    for (i = 0; i < arg->loops; ++i) {
        *arg->shared = *arg->shared + 1;
    }
    return 0;
}

int main(void) {
    pthread_t thread;
    struct ThreadArg arg;
    int counter = 0;

    arg.loops = 5;
    arg.shared = &counter;

    pthread_create(&thread, 0, worker, &arg);
    pthread_join(thread, 0);

    printf("counter=%d\n", counter);
    return 0;
}
