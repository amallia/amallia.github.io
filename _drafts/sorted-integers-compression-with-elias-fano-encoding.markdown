---
title: Sorted integers compression with Elias-Fano encoding
layout: post
description: 
tags: 
    - compression
    - elias-fano
    - data structures
image: /uploads/Elias-Fano.png
---

In the previous post we discovered [how to compress a set of integers]({{ site.url }}{% post_url 2017-12-12-on-the-fly-encoding-and-decoding-of-bitmaps %}) by representing it as a bitmap and then compressing the latter using a succinct representation.

This post instead is about compression of monotone non-decreasing integers lists by using Elias-Fano encoding. It may sounds like a niche algorithm, something that solves such an infrequent problem, but it is not like this.
Inverted indexes, which is the most common data structure used by search engines to index their data, are made of lists of increasing integers corresponding to the documents of the collection. I might write again in the future about inverted indexes in a more comprehensive way if this is a topic of your interest, if so please let me know with a comment.

Elias-Fano encoding has been proposed independently by Peter Elias and
Robert Mario Fano during the 70s, but their usefulness has been rediscovered recently. Elias-Fano representation is an elegant encoding scheme to
represent a monotone non-decreasing sequence of *n* integers from the universe *[0 . . . m)* occupying $$2n + n⌈\log{\frac{m}{n}}⌉$$bits, while supporting constant time access to the *i-th* element.

If we compare Elias-Fano encoding space requirement with the theoretical lower bound we realize that this structure is close to the bound, so it has been epithet **quasi-succint index**[^fn1].  

![Elias-Fano]({{ site.url }}/uploads/Elias-Fano.png){:class="img-responsive"}
In the Elias-Fano representation each integer is first binary encoded using
$$⌈\log{m}⌉$$ bits. Each binary representation of the elements is split in two: the higher part consisting of the first (left to right) $$⌈\log{n}⌉$$ bits and the lower part with the remaining $$⌈\log{m} - \log{n}⌉ = ⌈\log{m}⌉$$.
The concatenation of the lower part of each element of the list is the actual stored representation and takes trivially $$n \log{m}$$ bits. The higher part, instead, is a unary representation, specifically a bit-vector of size $$n + m/2^{⌈\log{m/n}⌉} = 2n$$ bits.
It is constructed starting from and empty bit-vector, we add a 0 as a stop bit for each possible value representable with the bits of the higher part length, we add a 1 for each value actually present positioning it before the correct stop bit. This makes clearer why we use exactly 2n bits, one bit set to 1 for the n elements and one 0 bit for all the possible distinct values obtainable with $$⌈\log{n}⌉$$ bits. Finally, the Elias-Fano representation is the bitvector resulting from the concatenation of the higher and the lower part.

Now, we show how to get an element given the information we have. In- terestingly, with this type of encoding, we can have random access for both Access and NextGeq(x) operations in logarithmic time.

1. Access(i): We get the lower bits by accessing directly to lo, then we compute the higher part by performing select1(i) − i over hi and we put together.

2. NextGeq(x): hx is the bucket such as x belongs. We perform select0(hx)− hx to find the first element p with the higher part greater than the higher part of x. At this point, we start to scan the elements from p and we stop at the first one greater than x. The scan can traverse at most the size of the bucket, that is log(m/n).

PEF [^fn2]

Skips [^fn3]

## References
[^fn1]: Sebastiano Vigna. 2013. Quasi-succinct indices. In Proceedings of the sixth ACM international conference on Web search and data mining (WSDM '13). ACM, New York, NY, USA, 83-92.

[^fn2]: Giuseppe Ottaviano and Rossano Venturini. 2014. Partitioned Elias-Fano indexes. In Proceedings of the 37th international ACM SIGIR conference on Research & development in information retrieval (SIGIR '14). ACM, New York, NY, USA, 273-282.

[^fn3]: Jianguo Wang, Chunbin Lin, Yannis Papakonstantinou, and Steven Swanson. 2017. An Experimental Study of Bitmap Compression vs. Inverted List Compression. In Proceedings of the 2017 ACM International Conference on Management of Data (SIGMOD '17). ACM, New York, NY, USA, 993-1008.

