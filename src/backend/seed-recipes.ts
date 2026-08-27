require('dotenv').config();
const { prisma } = require('./src/lib/prisma');

async function seed() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found. Exiting.");
    return;
  }

  const sampleRecipes = [
    { name: "Spicy Honey Garlic Salmon", calories: 450, protein: 42, carbs: 12, fat: 24, instructions: "Bake salmon at 400F for 15 mins. Glaze with honey, garlic, and sriracha." },
    { name: "Creamy Tuscan Chicken", calories: 520, protein: 55, carbs: 8, fat: 30, instructions: "Pan sear chicken breast. Make sauce with heavy cream, sun-dried tomatoes, and spinach." },
    { name: "Avocado Egg Toast", calories: 350, protein: 18, carbs: 25, fat: 22, instructions: "Toast whole wheat bread. Mash avocado. Top with two poached eggs and red pepper flakes." },
    { name: "Protein Packed Oatmeal", calories: 420, protein: 30, carbs: 55, fat: 8, instructions: "Cook oats with almond milk. Stir in whey protein powder, chia seeds, and sliced banana." },
    { name: "Steak and Sweet Potato Meal Prep", calories: 600, protein: 48, carbs: 45, fat: 22, instructions: "Grill sirloin steak. Roast cubed sweet potatoes and broccoli florets." },
    { name: "Greek Yogurt Parfait", calories: 280, protein: 22, carbs: 35, fat: 4, instructions: "Layer non-fat Greek yogurt with mixed berries and a sprinkle of granola." },
    { name: "Turkey Meatballs & Zucchini Noodles", calories: 380, protein: 40, carbs: 15, fat: 18, instructions: "Bake ground turkey meatballs. Serve over spiralized zucchini with marinara." },
    { name: "Peanut Butter Banana Smoothie", calories: 410, protein: 25, carbs: 48, fat: 14, instructions: "Blend banana, scoop of protein, 2 tbsp peanut butter, and almond milk." },
    { name: "Shrimp Tacos with Slaw", calories: 450, protein: 32, carbs: 50, fat: 12, instructions: "Sauté shrimp with taco seasoning. Serve in corn tortillas with cabbage slaw." },
    { name: "Chicken Pesto Pasta", calories: 580, protein: 45, carbs: 60, fat: 18, instructions: "Cook whole wheat penne. Toss with grilled chicken, cherry tomatoes, and basil pesto." },
    { name: "Quinoa Salad Bowl", calories: 390, protein: 15, carbs: 55, fat: 12, instructions: "Mix cooked quinoa with cucumbers, feta cheese, chickpeas, and lemon vinaigrette." },
    { name: "Cottage Cheese Pancakes", calories: 320, protein: 28, carbs: 30, fat: 6, instructions: "Blend oats, cottage cheese, and eggs. Cook on a non-stick griddle." },
    { name: "Teriyaki Tofu Stir-fry", calories: 380, protein: 22, carbs: 40, fat: 15, instructions: "Pan fry firm tofu cubes. Toss with broccoli, bell peppers, and low-sugar teriyaki." },
    { name: "Tuna Salad Stuffed Peppers", calories: 310, protein: 35, carbs: 12, fat: 14, instructions: "Mix canned tuna with Greek yogurt and celery. Stuff into halved bell peppers." },
    { name: "Keto Cheeseburger Bowl", calories: 550, protein: 45, carbs: 10, fat: 35, instructions: "Brown ground beef. Serve over lettuce with cheese, pickles, and special sauce." }
  ];

  console.log("Seeding 15 recipes...");

  for (let i = 0; i < sampleRecipes.length; i++) {
    const sr = sampleRecipes[i];
    const rec = await prisma.recipe.create({
      data: {
        userId: user.id,
        recipeName: sr.name,
        instructions: sr.instructions,
        calories: sr.calories,
        protein: sr.protein,
        carbs: sr.carbs,
        fat: sr.fat,
        status: 'APPROVED',
        ingredients: {
          create: [
            { ingredientName: "Main ingredient", quantity: "1 serving" }
          ]
        }
      }
    });
    console.log("Created: " + rec.id);
  }

  console.log("Done seeding recipes!");
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
