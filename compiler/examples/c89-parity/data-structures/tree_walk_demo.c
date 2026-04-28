#include <stdio.h>

struct TreeNode {
    int value;
    struct TreeNode *left;
    struct TreeNode *right;
};

void preorder(struct TreeNode *node) {
    if (node == 0) return;
    printf("%d\n", node->value);
    preorder(node->left);
    preorder(node->right);
}

int main(void) {
    struct TreeNode n1;
    struct TreeNode n2;
    struct TreeNode n3;
    struct TreeNode n4;

    n4.value = 4; n4.left = 0; n4.right = 0;
    n3.value = 3; n3.left = 0; n3.right = 0;
    n2.value = 2; n2.left = &n4; n2.right = 0;
    n1.value = 1; n1.left = &n2; n1.right = &n3;

    preorder(&n1);
    return 0;
}
