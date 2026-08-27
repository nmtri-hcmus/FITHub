import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export const BestMealBadge: React.FC = () => {
  const [topMeals, setTopMeals] = useState<any[]>([]);

  useEffect(() => {
    const fetchTopMeals = async () => {
      try {
        const recipes = await api.recipes.getApproved();
        if (recipes.length === 0) return;

        // Assign mock votes and suitable images for the seeded recipes if missing
        const fakeVotes = [154, 98, 75, 52, 41, 33, 27, 21, 15, 12, 10, 8, 5, 3, 1];
        
        const suitableImages: Record<string, string> = {
          'Spicy Honey Garlic Salmon': 'https://images.unsplash.com/photo-1467003909585-2f8aa5cd9f56?auto=format&fit=crop&w=800&q=80',
          'Creamy Tuscan Chicken': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
          'Avocado Egg Toast': 'https://images.unsplash.com/photo-1525351484163-7929051c9101?auto=format&fit=crop&w=800&q=80',
          'Protein Packed Oatmeal': 'https://images.unsplash.com/photo-1517673132405-a56a62723862?auto=format&fit=crop&w=800&q=80',
          'Steak and Sweet Potato Meal Prep': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80',
          'Greek Yogurt Parfait': 'https://images.unsplash.com/photo-1488477181943-685b881cb513?auto=format&fit=crop&w=800&q=80',
          'Turkey Meatballs & Zucchini Noodles': 'https://images.unsplash.com/photo-1529692236671-f1f6d3f23a50?auto=format&fit=crop&w=800&q=80',
          'Peanut Butter Banana Smoothie': 'https://images.unsplash.com/photo-1553530666-4c4be672e399?auto=format&fit=crop&w=800&q=80',
          'Shrimp Tacos with Slaw': 'https://images.unsplash.com/photo-1565299585323-b18413a96860?auto=format&fit=crop&w=800&q=80',
          'Chicken Pesto Pasta': 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80',
          'Quinoa Salad Bowl': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
          'Cottage Cheese Pancakes': 'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?auto=format&fit=crop&w=800&q=80',
          'Teriyaki Tofu Stir-fry': 'https://images.unsplash.com/photo-1512058564366-18510fd2b15e?auto=format&fit=crop&w=800&q=80',
          'Tuna Salad Stuffed Peppers': 'https://images.unsplash.com/photo-1603094892708-360e5015b6b1?auto=format&fit=crop&w=800&q=80',
          'Keto Cheeseburger Bowl': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'
        };

        for (let i = 0; i < recipes.length; i++) {
          const r = recipes[i];
          const imgKey = 'fithub_recipe_image_' + r.id;
          const voteKey = 'fithub_meal_vote_' + r.id;
          
          if (!localStorage.getItem(voteKey) && i < fakeVotes.length) {
            localStorage.setItem(voteKey, fakeVotes[i].toString());
          }
          if (!localStorage.getItem(imgKey) && suitableImages[r.recipeName]) {
            localStorage.setItem(imgKey, suitableImages[r.recipeName]);
          }
        }

        // Add vote counts to recipes
        const withVotes = recipes.map(r => {
          const votes = parseInt(localStorage.getItem('fithub_meal_vote_' + r.id) || '0');
          return { ...r, votes };
        });

        // Sort descending by votes
        withVotes.sort((a, b) => b.votes - a.votes);

        // Take top 3
        setTopMeals(withVotes.slice(0, 3));
      } catch (err) {
        console.error(err);
      }
    };
    fetchTopMeals();
  }, []);

  if (topMeals.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-black uppercase px-4 py-1.5 rounded-full tracking-wider mb-4">
          🏆 Top 3 Meals of the Week
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-gray-900">Community Favorites</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {topMeals.map((meal, index) => {
          const image = localStorage.getItem('fithub_recipe_image_' + meal.id);
          const medals = ['🥇', '🥈', '🥉'];
          
          return (
            <div key={meal.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl flex flex-col relative group hover:-translate-y-2 transition-transform duration-300">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl border-4 border-emerald-50 z-10">
                {medals[index]}
              </div>
              
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-6 relative">
                {image ? (
                  <img src={image} alt="Best meal" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">🍲</div>
                )}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-emerald-600 shadow-sm">
                  {meal.votes} Votes
                </div>
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-2">{meal.recipeName}</h3>
              <p className="text-gray-500 mb-6 line-clamp-2 text-sm leading-relaxed flex-1">{meal.instructions}</p>
              
              <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-700 mb-6 bg-gray-50 p-3 rounded-xl">
                <span>🔥 {meal.calories} kcal</span>
                <span>🥩 {meal.protein}g</span>
                <span>🥑 {meal.fat}g</span>
                <span>🍞 {meal.carbs}g</span>
              </div>
              
              <a href="/community?tab=vote" className="w-full bg-emerald-50 text-emerald-700 text-center py-3 rounded-xl font-bold hover:bg-emerald-100 transition-colors">
                View Recipe
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
