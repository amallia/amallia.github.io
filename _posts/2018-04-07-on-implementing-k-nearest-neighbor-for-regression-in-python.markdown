---
title: On implementing k Nearest Neighbor for regression in Python
description: 
tags: 
    - machine-learning
    - Nearest Neighbor
    - regression
layout: post
image: /uploads/k-NN.jpg
---

![k-NN]({{ site.url }}/uploads/k-NN.jpg){:class="img-responsive center-block"}

The basic **Nearest Neighbor** (NN) algorithm is simple and can be used for classification or regression. NN is a non-parametric approach and the intuition behind it is that similar examples $$x^t$$ should have similar outputs $$r^t$$.

Given a training set, all we need to do to predict the output for a new example $$x$$ is to find the "most similar" example $$x^t$$ in the training set.

A slight variation of NN is **k-NN** where given an example $$x^t$$ we want to predict we find the k nearest samples in the training set.
The basic Nearest Neighbor algorithm does not handle outliers well, because it has high variance, meaning that its predictions can vary a lot depending on which examples happen to appear in the training set. The k Nearest Neighbor algorithm addresses these problems.

To do classification, after finding the $$k$$ nearest sample, take the most frequent label of their labels. 
For regression, we can take the mean or median of the k neighbors, or we can solve a linear regression problem on the neighbors

Nonparametric methods are still subject to underfitting and overfitting, just like parametric methods.
In this case, 1-nearest neighbors is overfitting since it reacts too much to the outliers. High $$k$$, on the other hand,  would underfit.
As usual, cross-validation can be used to select the best value of $$k$$.

## Distance

The very word "nearest" implies a distance metric. How do we measure the distance from a query point $$x^i$$ to an example point $$x^j$$?

Typically, distances are measured with a **Minkowski distance** or $$L^p$$ norm, defined as:

$$L^p(x^i, x^j) = ( \sum_d |x_d^i - x_d^j |^p )^{\frac{1}{p}}$$

With $$p = 2$$ this is **Euclidean distance** and with $$p = 1$$ it is **Manhattan distance**.
With Boolean attribute values, the number of attributes on which the two points differ is called the **Hamming distance**.

For our purposes we will adopt Euclidean distance and since our dataset is made of two attributes we can use the following function where $$x^t = (x_t, y_t)$$.

```python
    @staticmethod
    def __euclidean_distance(x1, y1, x2, y2):
        return math.sqrt((x1 - x2)**2 + (y1 - y2)**2)
```

### Weighted distance

Instead of computing an average of the $$k$$ neighbors, we can compute a weighted average of the neighbors. A common way to do this is to weight each of the neighbors by a factor of $$1/d$$, where $$d$$ is its distance from the test example.
The weighted average of neighbors $$x_1 , \dots , x_k$$ is then $$(\sum_1^k (1/d^k) r^t)/(\sum_1^k (1/d^k))$$, where $$d_t$$ is the distance of the $$t$$th neighbor.

For our implementation, we chose to use weighted distance according to a paper[^fnSarma] which proposes another improvement to the basic k-NN where the weights to nearest neighbors are given based on Gaussian distribution.

```python
    @staticmethod
    def gaussian(dist, sigma=1):
        return 1./(math.sqrt(2.*math.pi)*sigma)*math.exp(-dist**2/(2*sigma**2))
```

## Initialization

Given a training set, we need first to store it as we will use it at prediction time.
Clearly, k cannot be bigger than the training set itself.

```python
class kNN(object):

    def __init__(self, x, y, k, weighted=False):
        assert (k <= len(x)
                ), "k cannot be greater than training_set length"
        self.__x = x
        self.__y = y
        self.__k = k
        self.__weighted = weighted
```

## Prediction

Predicting the output for a new example $$x$$ is conceptually trivial. 
All we need to do is:
- iterate through the examples
- measure the distance from each one to $$x$$
- keep the best $$k$$

Depending if we are doing classification or regression we would treat those $$k$$ examples differently. In this case, we will do regression, so our prediction will be just the average of the samples.

```python
    def predict(self, test_set):
        predictions = []
        for i, j in test_set.values:
            distances = []
            for idx, (l, m) in enumerate(self.__x.values):
                dist = self.__euclidean_distance(i, j, l, m)
                distances.append((self.__y[idx], dist))
            distances.sort(key=operator.itemgetter(1))
            v = 0
            total_weight = 0
            for i in range(self.__k):
                weight = self.gaussian(distances[i][1])
                if self.__weighted:
                    v += distances[i][0]*weight
                else:
                    v += distances[i][0]
                total_weight += weight
            if self.__weighted:
                predictions.append(v/total_weight)
            else:
                predictions.append(v/self.__k)
        return predictions
```

If we are happy with an implementation that takes $$O(N)$$ execution time, then that is the end of the story. If not, there are possible optimization using indexes based on additional data structures, i.e. k-d trees or hash tables, which I might write about in the future.

## Strength and Weakness 

k Nearest Neighbor estimation was proposed sixty years ago, but because of the need for large memory and computation, the approach was not popular for a long time. With advances in parallel processing and with memory and computation getting cheaper, such methods have recently become more widely used.
Unfortunately, it can still be quite computationally expensive when it comes to large training dataset as we need to compute the distance for each sample.
Some indexing (e.g. k-d tree) may reduce this cost.

Also, when we consider low-dimensional spaces and we have enough data, NN works very well in terms of accuracy, as we have enough nearby data points to get a good answer. As the number of dimensions rises the algorithm performs worst, this is due to the fact that the distance measure becomes meaningless when the dimension of the data increases significantly.

On the other hand, k-NN is quite robust to noisy training data, especially when a weighted distance is used.

## Dataset

To test our k-NN implementation we will perform experiments using a version of the automobile dataset from the UC Irvine Repository. The problem will be to predict the miles per gallon (mpg) of a car, given its displacement and horsepower. Each example in the dataset corresponds to a single car.

    Number of Instances: 291 in the training set, 100 in the test set
    Number of Attributes: 2 continous input attributes, one continuous output

Attribute Information:

    1. displacement:  continuous 
    2. horsepower:    continuous
    3. mpg:           continuous (output)

The following is an extract of how the dataset looks like:
```json
displacement,horsepower,mpg
307,130,18
350,165,15
318,150,18
304,150,16
302,140,17
429,198,15
454,220,14
440,215,14
455,225,14
```

### Read the data

First, we read the data using pandas.

```python
import pandas

training_data = pandas.read_csv("auto_train.csv")
x = training_data.iloc[:,:-1]
y = training_data.iloc[:,-1]

test_data = pandas.read_csv("auto_test.csv")
x_test = test_data.iloc[:,:-1]
y_test = test_data.iloc[:,-1]
```

### Predict 

Using the data in the training set, we predicted the output for each example in the test, for $$k = 1$$, $$k = 3$$, and $$k = 20$$. Reported the squared error on the test set.
As we can see the test error goes down while increasing $$k$$.

```python
from kNN import kNN
from sklearn.metrics import mean_squared_error

for k in [1, 3, 20]:
    classifier = kNN(x,y, k)
    pred_test = classifier.predict(x_test)

    test_error = mean_squared_error(y_test, pred_test)
    print("Test error with k={}: {}".format(k, test_error * len(y_test)/2))
```

    Test error with k=1: 2868.0049999999997
    Test error with k=3: 2794.729999999999
    Test error with k=20: 2746.1914125


### Weighted k-NN

Using weighted k-NN we obtained better performance than with simple k-NN.

```python
from kNN import kNN

for k in [1, 3, 20]:
    classifier = kNN(x,y, k, weighted=True)
    pred_test = classifier.predict(x_test)

    test_error = mean_squared_error(y_test, pred_test)
    print("Test error with k={}: {}".format(k, test_error * len(y_test)/2))
```

    Test error with k=1: 2868.005
    Test error with k=3: 2757.3065023859417
    Test error with k=20: 2737.9437262401907

## Full implementation

This is how the full implementation looks like after putting all the parts together.

You can find the whole source code and the dataset used here: https://github.com/amallia/kNN

```python
#!/usr/bin/env python
import math
import operator


class kNN(object):

    def __init__(self, x, y, k, weighted=False):
        assert (k <= len(x)
                ), "k cannot be greater than training_set length"
        self.__x = x
        self.__y = y
        self.__k = k
        self.__weighted = weighted

    @staticmethod
    def __euclidean_distance(x1, y1, x2, y2):
        return math.sqrt((x1 - x2)**2 + (y1 - y2)**2)

    @staticmethod
    def gaussian(dist, sigma=1):
        return 1./(math.sqrt(2.*math.pi)*sigma)*math.exp(-dist**2/(2*sigma**2))

    def predict(self, test_set):
        predictions = []
        for i, j in test_set.values:
            distances = []
            for idx, (l, m) in enumerate(self.__x.values):
                dist = self.__euclidean_distance(i, j, l, m)
                distances.append((self.__y[idx], dist))
            distances.sort(key=operator.itemgetter(1))
            v = 0
            total_weight = 0
            for i in range(self.__k):
                weight = self.gaussian(distances[i][1])
                if self.__weighted:
                    v += distances[i][0]*weight
                else:
                    v += distances[i][0]
                total_weight += weight
            if self.__weighted:
                predictions.append(v/total_weight)
            else:
                predictions.append(v/self.__k)
        return predictions
```

## References 

[^fnSarma]: Sarma, T. Hitendra et al. An improvement to k-nearest neighbor classifier. 2011 IEEE Recent Advances in Intelligent Computational Systems (2011): 227-231.


