import scrapy

class AsinRegistryItem(scrapy.Item):
    asin         = scrapy.Field()
    model        = scrapy.Field()
    title        = scrapy.Field()
    brand        = scrapy.Field()
    search_query = scrapy.Field()

class SellerPriceItem(scrapy.Item):
    asin           = scrapy.Field()
    seller_name    = scrapy.Field()
    seller_id      = scrapy.Field()
    price          = scrapy.Field()
    total_price    = scrapy.Field()
    shipping       = scrapy.Field()
    fba_status     = scrapy.Field()
    is_buybox      = scrapy.Field()
    seller_rating  = scrapy.Field()
    condition_type = scrapy.Field()
    pincode        = scrapy.Field()