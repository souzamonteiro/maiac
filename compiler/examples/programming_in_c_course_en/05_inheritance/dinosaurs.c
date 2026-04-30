/* dinosaurs: The template eat<T>() method is replaced by a plain function  */
/* that takes two Dinosaur pointers. The Brontosaurus/Pterodactyl/           */
/* Tyrannosaurus subtypes use an enum type tag inside the shared struct.     */
#include <stdio.h>

typedef enum {
    DINO_BRONTOSAURUS,
    DINO_PTERODACTYL,
    DINO_TYRANNOSAURUS
} DinoType;

typedef struct {
    DinoType type;
    char name[50];
} Dinosaur;

void dinosaur_init(Dinosaur *d, DinoType type, const char *name) {
    int i;
    d->type = type;
    for (i = 0; name[i] && i < 49; i++) d->name[i] = name[i];
    d->name[i] = '\0';
}

void dinosaur_eat(Dinosaur *predator, Dinosaur *prey) {
    printf("%s ate %s.\n", predator->name, prey->name);
}

int main(void) {
    Dinosaur dino;
    Dinosaur peter;
    Dinosaur rex;

    dinosaur_init(&dino,  DINO_BRONTOSAURUS,  "Dino");
    dinosaur_init(&peter, DINO_PTERODACTYL,   "Peter");
    dinosaur_init(&rex,   DINO_TYRANNOSAURUS, "Rex");

    printf("The name of dinosaur dino is %s.\n",  dino.name);
    printf("The name of dinosaur peter is %s.\n", peter.name);
    printf("The name of dinosaur rex is %s.\n",   rex.name);

    dinosaur_eat(&rex, &dino);

    return 0;
}
