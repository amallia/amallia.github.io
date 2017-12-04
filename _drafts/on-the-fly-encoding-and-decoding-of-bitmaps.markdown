---
title: On-the-fly encoding and decoding of bitmaps
layout: post
tags: 
    - compression 
    - bitmaps
    - bitvector
---
![binary-code]({{ site.url }}/uploads/binary-code.png){:class="img-responsive"}

A bitmap, also referred as bit-vector or bit-array, is a sequence of 0s and 1s which typically encodes a more complex object. 

A trivial example of this is a set of numbers where each of the elements are encoded as set bits in a bitmap of length equal to the greatest element plus one (as we count from zero), also commonly referred as the *universe*. As an example, the set `{3,12,21,4,23}` can be encoded as <kbd>101000000001000000011000</kbd>, where - counting right to left - we have the 1-bits at the corresponding positions of the elements in the initial set.

The importance of bitmaps is irrefutable, this is why I recently started investigating what are the most effective techniques used to compress them. 
Being able to reduce their memory usage means being able to store more data or, possibly, fit it in a higher level of the cache hierarchy which immediately translates to faster access. 

The technique I would like to discuss sets the base of more complex ones, which I will try to cover in a future article. The most important property of the following compression algorithm is the ability to query the bitmap without fully decompressing it. Considering the set we saw in the previous example, this would be extremely appealing, as we would be able to tell if an element *i* is present or not just by looking at the bit at position *i*.  
This category of data structures are called **succinct data structures**, which allow efficient query operations while using an amount of space that is close to the information-theoretic lower bound.

Now we split the bitmap into fixed-length blocks. In the previous example, the bitmap was 24-bit long, if we split it into blocks of 6-bits each we obtain four distinct blocks.

<center><kbd>1010</kbd> <kbd>0000</kbd> <kbd>0001</kbd> <kbd>0000</kbd> <kbd>0001</kbd> <kbd>1000</kbd></center>

 The intuition is to code each block independently from the the others, using a pair of values *<C<sub>i</sub>,O<sub>i</sub>>* for the *i-th* block. 
 The first element of the pair is the cardinality of the block, also referred as population count or just *popcount*; while the latter is the offset in the table that contains all the distinct permutations (so combinations) of the bits in that block [^fn1].

Let's say we want to encode the first block <kbd>1010</kbd>. Calculating *C* is trivial as we need to count the number of bits set to 1. This can also be done in hardware by most of the modern CPUs (I will come back to this topic again in the future), but for now, we can rely on the following naive implementation.

{% highlight cpp %}
size_t popcount(uint64_t n)
{
    size_t count = 0;
    for(size_t i = 0; n > 0; ++i )
    {
        count += n & 1;
        n >>= 1;
    }
    return count;
}
{% endhighlight %}

Now lets imagine we have a table containing all the $$\binom{4}{2} = 6$$ ordered permutations of the previous block. If we iterated over the rows of this table and stop when we reach the entry that matches our block, then we would have computed the offset for that block. 

|-----------------|:-----------------:|
| 0               | <kbd>0011</kbd> |
| 1               | <kbd>0101</kbd> |
| 2               | <kbd>0110</kbd> |
| 3               | <kbd>1001</kbd> |
| <mark>4</mark>  | <kbd>1010</kbd> |
| 5               | <kbd>1100</kbd> |
{:style="margin: auto;"}

In this way we can encode our block with the two integers *C = 2* and *O = 4*.

Whenever we would like to decode the block from the given *C* and *O* we need to select the appropriate table of combinations using *C* and then move to the index *O* of that table to retrieve the original representation.

In this environment if we were only interested in the *i-th* bit, we would have decoded the entire block and applied a proper mask to filter it out. 

## Cost analysis

So far we realized we need to store a pair for integers for each block, so for $$m/b$$ blocks where *m* is the original bitmap length and b is the fixed block size. We know that the population count of the block cannot be greater then the block size its-self, since there cannot be more than *b* set bits in a block. Then we can state that the C coefficients can be stored in $$\log_2(b)$$ bits. 
Regarding the offsets we know that they are indexes in a table, but the table size depends on two factors: the blocks size and the number of set bits in it.
We know that the former is the same for block, but the population count can vary.

There are two lucky cases where the cardinality gives us enough information to infer the offset:

1. if it is 0, as we know then only permutation is then one where all the bits are unset
2. if it is equal to the size of the block, where the block as all the bits set.

In these two cases we can store the offset implicitly and so we would not sacrifice any extra space. For all the other possibilities we can always store the offset in $$\log_2\binom{b}{C}$$ bits.

For instance, the original bitmap we used in the previous example used 24 bits of actual data in its uncompressed form. To store the cardinality of each block we would need 2 bits per block, for a total of 12 bits. Then, the block containing all-zeros is encoded implicitly, while for the block with *C = 1* additional 2 bits and 3 bits for the blocks with *C = 2*. This sums up to 21 bits used to represent our uncompressed 24-bit bitmap, with a saving of 3 bits or 12.5% of the initial size. 

## On-the-fly generation of ordered binary permutations

At this point we know how to encode and decode a block, what is actually missing is the way to generate the lookup table of the permutations. The answer is that we don't do it, but the ordered binary permutations are generated on-the-fly [^fn2].

For small blocks it would actually be doable and probably also convenient, but is the block gets bigger then it is just not practicable. What is needed is an algorithm to compute offsets for a given block and being able to go back from the offset to the original block in a reasonably effective way.

### Compute offsets

The aim of the computation of the offset is to find the index of a block, given its size and population count, in a table listing all the possible permutations. Moreover, it needs to be deterministic and without the overhead of an actual table. 

{% highlight cpp %}
uint64_t compute_offset(uint64_t block_size, uint64_t count, uint64_t i) {
    uint64_t offset = 0;
    uint64_t n = block_size - 1;
    while (count > 0) {
        if (i & (1ULL << n)) {
            if (count <= n)
                offset += boost::math::binomial_coefficient<double>(n, count);
            --count;
        }
        --n;
    }
    return offset;
}
{% endhighlight %}

### Decode offsets on the fly

Now we need to reverse the encoding process.
If $$offset \geq \binom{n-1}{count}$$, then the first bit of the block was a 1 and we decrement both *n* and *count* and subtract $$\binom{t-1}{count}$$ from the offset; otherwise it was a 0 and we decrement only *n*. 
Every iteration the block size decrease by one bit. We can stop when we have processed the whole block or when the count reaches 0 as it means there remaining bits are all unset.

{% highlight cpp %}
uint64_t decode_offset(uint64_t block_size, uint64_t count, uint64_t offset) {
  uint64_t result = 0;
  uint64_t n = block_size - 1;
  while (count > 0 && n > 0) {
    if (count <= n &&
        offset >= boost::math::binomial_coefficient<double>(n, count)) {
      offset -= boost::math::binomial_coefficient<double>(n, count);
      result |= (1ULL << n);
      --count;
    }
    --n;
  }
  if (count > 0)
    result |= (1ULL << count) - 1;
  return result;
}
{% endhighlight %}

Since most of the times we are interested in a single bit of the block and blocks can be quite long and so slower to decode, we can perform two forms of optimization. The former is to stop the iteration when we reach the given position, the latter is to perform a binary search instead of the linear scan we already described. The combination of the two solutions is ideal, indeed a linear scan is still faster when the position we are interested in is within the first $$block\_size \cdot \log_2(block\_size)$$ elements. Otherwise, we can perform...

## References

[^fn1]: Rajeev Raman, Venkatesh Raman, and S. Srinivasa Rao. 2002. Succinct indexable dictionaries with applications to encoding k-ary trees and multisets. In Proceedings of the thirteenth annual ACM-SIAM symposium on Discrete algorithms (SODA '02). Society for Industrial and Applied Mathematics, Philadelphia, PA, USA, 233-242.

[^fn2]: Gonzalo Navarro and Eliana Providel. 2012. Fast, small, simple rank/select on bitmaps. In Proceedings of the 11th international conference on Experimental Algorithms (SEA'12), Ralf Klasing (Ed.). Springer-Verlag, Berlin, Heidelberg, 295-306.
