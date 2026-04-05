
import os
from dotenv import load_dotenv
from supabase import create_client

def test_supabase_connection():
    load_dotenv(dotenv_path='c:/Users/damod/Desktop/Hackathon/scraper/.env')
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_KEY environment variables are not set.")
        print("Please create a .env file in the 'scraper' directory with these values.")
        return

    print("Attempting to connect to Supabase...")
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("Supabase client created.")
        
        # Attempt to fetch a small amount of data to verify connection and credentials
        print("Attempting to fetch data from 'asin_registry' table...")
        response = supabase.table('asin_registry').select('asin').limit(1).execute()
        
        print("Connection successful!")
        if response.data:
            print("Successfully fetched data.")
        else:
            print("Could connect, but 'asin_registry' table might be empty or not exist.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_supabase_connection()
