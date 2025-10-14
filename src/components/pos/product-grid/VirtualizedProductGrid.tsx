import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Product } from '@/types';
import ProductCard from './ProductCard';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface VirtualizedProductGridProps {
  products: Product[];
  isShiftActive: boolean;
  getCategoryName: (categoryId: string | undefined) => string;
  onProductClick: (product: Product) => void;
  columnCount?: number;
  rowHeight?: number;
  columnWidth?: number;
}

// Memoized cell renderer for virtual grid
const Cell = memo(({ 
  columnIndex, 
  rowIndex, 
  style, 
  data 
}: {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    products: Product[];
    columnCount: number;
    isShiftActive: boolean;
    getCategoryName: (categoryId: string | undefined) => string;
    onProductClick: (product: Product) => void;
  };
}) => {
  const { products, columnCount, isShiftActive, getCategoryName, onProductClick } = data;
  const index = rowIndex * columnCount + columnIndex;
  
  if (index >= products.length) {
    return <div style={style} />;
  }
  
  const product = products[index];
  
  return (
    <div style={{ ...style, padding: '4px' }}>
      <ProductCard
        product={product}
        isShiftActive={isShiftActive}
        getCategoryName={getCategoryName}
        onClick={onProductClick}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  const prevIndex = prevProps.rowIndex * prevProps.data.columnCount + prevProps.columnIndex;
  const nextIndex = nextProps.rowIndex * nextProps.data.columnCount + nextProps.columnIndex;
  
  const prevProduct = prevProps.data.products[prevIndex];
  const nextProduct = nextProps.data.products[nextIndex];
  
  return (
    prevProduct === nextProduct &&
    prevProps.data.isShiftActive === nextProps.data.isShiftActive
  );
});

Cell.displayName = 'VirtualizedCell';

export const VirtualizedProductGrid = memo(function VirtualizedProductGrid({
  products,
  isShiftActive,
  getCategoryName,
  onProductClick,
  columnCount = 7,
  rowHeight = 180,
  columnWidth = 160
}: VirtualizedProductGridProps) {
  const gridRef = useRef<any>(null);
  
  // Calculate row count based on products and columns
  const rowCount = useMemo(() => {
    return Math.ceil(products.length / columnCount);
  }, [products.length, columnCount]);
  
  // Memoize grid data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    products,
    columnCount,
    isShiftActive,
    getCategoryName,
    onProductClick
  }), [products, columnCount, isShiftActive, getCategoryName, onProductClick]);
  
  // Reset scroll position when products change
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollTop: 0 });
    }
  }, [products]);
  
  // Performance tracking
  useEffect(() => {
    const operationId = `virtualized-grid-${Date.now()}`;
    performanceMonitor.start(operationId, 'Virtualized Grid Render', {
      productCount: products.length,
      rowCount,
      columnCount
    });
    return () => {
      performanceMonitor.end(operationId);
    };
  }, [products.length, rowCount, columnCount]);
  
  console.log('⚡ [VIRTUALIZED GRID] Rendering with', {
    productCount: products.length,
    rowCount,
    columnCount,
    estimatedRenderedCells: Math.min(rowCount * columnCount, products.length)
  });
  
  if (products.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>No products found</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full">
      <AutoSizer>
        {({ height, width }) => {
          // Calculate responsive column count based on width
          const responsiveColumnCount = Math.max(3, Math.floor(width / columnWidth));
          const responsiveRowCount = Math.ceil(products.length / responsiveColumnCount);
          
          return (
            <Grid
              ref={gridRef}
              columnCount={responsiveColumnCount}
              columnWidth={width / responsiveColumnCount}
              height={height}
              rowCount={responsiveRowCount}
              rowHeight={rowHeight}
              width={width}
              itemData={{
                ...itemData,
                columnCount: responsiveColumnCount
              }}
              overscanRowCount={2}
              overscanColumnCount={1}
            >
              {Cell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.products === nextProps.products &&
    prevProps.isShiftActive === nextProps.isShiftActive &&
    prevProps.columnCount === nextProps.columnCount
  );
});

export default VirtualizedProductGrid;
