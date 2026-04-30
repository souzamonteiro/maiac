/* dinosaurs_v2: Adds a LifeForm base layer. LifeForm is embedded as the     */
/* first field of Dinosaur, mirroring C++ inheritance. Any LifeForm pointer  */
/* can be safely passed where a LifeForm* is expected.                       */
#include <stdio.h>

typedef struct {
    char name[50];
} LifeForm;

void lifeform_init(LifeForm *lf, const char *name) {
    int i;
    for (i = 0; name[i] && i < 49; i++) lf->name[i] = name[i];
    lf->name[i] = '\0';
}

typedef struct {
    LifeForm base;  /* "inherits" LifeForm */
} Dinosaur;

void dinosaur_init(Dinosaur *d, const char *name) {
    lifeform_init(&d->base, name);
}

void dinosaur_eat(Dinosaur *predator, LifeForm *prey) {
    printf("%s ate %s.\n", predator->base.name, prey->name);
}

int main(void) {
    LifeForm plant;
    Dinosaur dino;
    Dinosaur peter;
    Dinosaur rex;

    lifeform_init(&plant, "Phyllis");
    dinosaur_init(&dino,  "Dino");
    dinosaur_init(&peter, "Peter");
    dinosaur_init(&rex,   "Rex");

    printf("The name of dinosaur dino is %s.\n",  dino.base.name);
    printf("The name of dinosaur peter is %s.\n", peter.base.name);
    printf("The name of dinosaur rex is %s.\n",   rex.base.name);

    dinosaur_eat(&dino, &plant);
    dinosaur_eat(&rex,  &dino.base);

    return 0;
}
