#include <stdio.h>

#define NODES 6
#define QUEUE_CAP 16

void bfs(const int graph[NODES][NODES], int start) {
    int visited[NODES] = {0, 0, 0, 0, 0, 0};
    int queue[QUEUE_CAP];
    int head = 0;
    int tail = 0;
    int i;

    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
        int node = queue[head++];
        printf("%d\n", node);
        for (i = 0; i < NODES; ++i) {
            if (graph[node][i] && !visited[i]) {
                visited[i] = 1;
                queue[tail++] = i;
            }
        }
    }
}

int main(void) {
    int graph[NODES][NODES] = {
        {0,1,1,0,0,0},
        {0,0,1,1,0,0},
        {0,0,0,1,1,0},
        {0,0,0,0,0,1},
        {0,0,0,0,0,1},
        {0,0,0,0,0,0}
    };
    bfs(graph, 0);
    return 0;
}
